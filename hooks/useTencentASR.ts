'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { encodeFloat32ToPcm16le, resampleTo16kSync } from '@/lib/audio-utils';

interface UseTencentASROptions {
  onTranscript: (text: string, isFinal: boolean) => void;
  onError: (error: string) => void;
  language?: string;
}

interface TencentAsrMessage {
  code?: number;
  message?: string;
  final?: number;
  result?: {
    slice_type?: number;
    index?: number;
    voice_text_str?: string;
  };
  slice_type?: number;
  index?: number;
  voice_text_str?: string;
}

const TARGET_SAMPLE_RATE = 16000;
const CHUNK_DURATION_MS = 200;
const TARGET_CHUNK_BYTES = TARGET_SAMPLE_RATE * (CHUNK_DURATION_MS / 1000) * 2;
const PREOPEN_BUFFER_MAX_CHUNKS = 10;
const CLEANUP_DELAY_MS = 300;
const MAX_SESSION_MS = 60000;
const RECONNECT_DELAY_MS = 200;
const ENDING_PUNCTUATION = new Set(['.', ',', '!', '?', ';', ':']);

function clearTimer(timerRef: { current: ReturnType<typeof setTimeout> | null }) {
  if (timerRef.current) {
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }
}

function sanitizeTranscriptText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function appendPunctuationIfNeeded(text: string): string {
  const normalized = text.trim();
  if (!normalized) return normalized;

  const lastChar = normalized.slice(-1);
  if (ENDING_PUNCTUATION.has(lastChar)) return normalized;

  return `${normalized}.`;
}

function resolveEngineModelType(language: string): string {
  const envModel =
    process.env.NEXT_PUBLIC_TENCENT_ASR_ENGINE_MODEL?.trim() ||
    process.env.NEXT_PUBLIC_ASR_ENGINE_MODEL?.trim();
  if (envModel) return envModel;

  if (language.startsWith('en')) return '16k_en';
  return '16k_zh';
}

function safeParseAsrMessage(raw: string): TencentAsrMessage | null {
  try {
    return JSON.parse(raw) as TencentAsrMessage;
  } catch {
    return null;
  }
}

function concatBytes(left: Uint8Array, right: Uint8Array): Uint8Array {
  if (left.length === 0) return right;
  if (right.length === 0) return left;

  const merged = new Uint8Array(left.length + right.length);
  merged.set(left);
  merged.set(right, left.length);
  return merged;
}

function getAsrMessageText(message: TencentAsrMessage): string {
  return message.result?.voice_text_str ?? message.voice_text_str ?? '';
}

function getAsrSliceType(message: TencentAsrMessage): number | undefined {
  return message.result?.slice_type ?? message.slice_type;
}

function getAsrResultIndex(message: TencentAsrMessage): number | undefined {
  return message.result?.index ?? message.index;
}

export function useTencentASR({ onTranscript, onError, language = 'zh-CN' }: UseTencentASROptions) {
  const [isActive, setIsActive] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sinkNodeRef = useRef<GainNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const isStartingRef = useRef(false);
  const shouldKeepListeningRef = useRef(false);
  const stopReasonRef = useRef<'manual' | 'socket' | 'rollover' | null>(null);

  const pendingAudioRef = useRef<Uint8Array>(new Uint8Array(0));
  const preOpenAudioChunksRef = useRef<Uint8Array[]>([]);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shutdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousInterimTextRef = useRef('');
  const finalizedIndexSetRef = useRef<Set<number>>(new Set());

  const startRef = useRef<() => Promise<void>>(async () => {});

  const resetRuntimeState = useCallback(() => {
    pendingAudioRef.current = new Uint8Array(0);
    preOpenAudioChunksRef.current = [];
    previousInterimTextRef.current = '';
    finalizedIndexSetRef.current = new Set();
  }, []);

  const cleanup = useCallback(() => {
    clearTimer(shutdownTimerRef);
    clearTimer(sessionTimerRef);

    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch {}
      sourceNodeRef.current = null;
    }

    if (scriptProcessorRef.current) {
      try {
        scriptProcessorRef.current.onaudioprocess = null;
        scriptProcessorRef.current.disconnect();
      } catch {}
      scriptProcessorRef.current = null;
    }

    if (sinkNodeRef.current) {
      try {
        sinkNodeRef.current.disconnect();
      } catch {}
      sinkNodeRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        void audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (wsRef.current) {
      try {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onerror = null;
        wsRef.current.onclose = null;
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }

    isStartingRef.current = false;
    resetRuntimeState();
  }, [resetRuntimeState]);

  const flushPendingAudio = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (pendingAudioRef.current.length === 0) return;

    const payload = pendingAudioRef.current.buffer.slice(
      pendingAudioRef.current.byteOffset,
      pendingAudioRef.current.byteOffset + pendingAudioRef.current.byteLength
    );
    ws.send(payload);
    pendingAudioRef.current = new Uint8Array(0);
  }, []);

  const sendEndMessage = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    try {
      flushPendingAudio();
      ws.send(JSON.stringify({ type: 'end' }));
    } catch {}
  }, [flushPendingAudio]);

  const appendAudioChunk = useCallback((chunk: Uint8Array) => {
    const ws = wsRef.current;
    if (!ws) return;

    if (ws.readyState !== WebSocket.OPEN) {
      preOpenAudioChunksRef.current.push(chunk);
      if (preOpenAudioChunksRef.current.length > PREOPEN_BUFFER_MAX_CHUNKS) {
        preOpenAudioChunksRef.current.shift();
      }
      return;
    }

    if (preOpenAudioChunksRef.current.length > 0) {
      for (const buffered of preOpenAudioChunksRef.current) {
        pendingAudioRef.current = concatBytes(pendingAudioRef.current, buffered);
      }
      preOpenAudioChunksRef.current = [];
    }

    pendingAudioRef.current = concatBytes(pendingAudioRef.current, chunk);
    while (pendingAudioRef.current.length >= TARGET_CHUNK_BYTES) {
      const frame = pendingAudioRef.current.slice(0, TARGET_CHUNK_BYTES);
      ws.send(frame.buffer);
      pendingAudioRef.current = pendingAudioRef.current.slice(TARGET_CHUNK_BYTES);
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    clearTimer(reconnectTimerRef);
    if (!shouldKeepListeningRef.current) return;

    reconnectTimerRef.current = setTimeout(() => {
      if (!shouldKeepListeningRef.current) return;
      if (isStartingRef.current || wsRef.current) return;
      void startRef.current();
    }, RECONNECT_DELAY_MS);
  }, []);

  const stop = useCallback(() => {
    shouldKeepListeningRef.current = false;
    stopReasonRef.current = 'manual';
    setIsActive(false);
    clearTimer(reconnectTimerRef);

    if (!wsRef.current && !streamRef.current) {
      cleanup();
      return;
    }

    sendEndMessage();
    clearTimer(shutdownTimerRef);
    shutdownTimerRef.current = setTimeout(() => {
      cleanup();
    }, CLEANUP_DELAY_MS);
  }, [cleanup, sendEndMessage]);

  const start = useCallback(async () => {
    shouldKeepListeningRef.current = true;
    stopReasonRef.current = null;
    setIsActive(true);

    if (isStartingRef.current || wsRef.current) return;
    isStartingRef.current = true;

    try {
      resetRuntimeState();

      const engineModelType = resolveEngineModelType(language);
      const query = new URLSearchParams({
        engineModelType,
        voiceFormat: '1',
        needVad: '1',
        vadSilenceTime: '700',
        maxSpeakTime: '60000',
        filterModal: '1',
        filterDirty: '0',
        filterPunc: '0',
        convertNumMode: '1',
      });

      const response = await fetch(`/api/asr/realtime?${query.toString()}`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Failed to create Tencent ASR signature');
      }

      const body = (await response.json()) as { url?: string };
      if (!body.url) {
        throw new Error('Missing Tencent ASR websocket URL');
      }

      const ws = new WebSocket(body.url);
      wsRef.current = ws;

      ws.onopen = () => {
        stopReasonRef.current = null;

        if (preOpenAudioChunksRef.current.length > 0) {
          for (const buffered of preOpenAudioChunksRef.current) {
            appendAudioChunk(buffered);
          }
          preOpenAudioChunksRef.current = [];
        }

        clearTimer(sessionTimerRef);
        sessionTimerRef.current = setTimeout(() => {
          if (!shouldKeepListeningRef.current) return;

          stopReasonRef.current = 'rollover';
          sendEndMessage();
          clearTimer(shutdownTimerRef);
          shutdownTimerRef.current = setTimeout(() => {
            cleanup();
            scheduleReconnect();
          }, CLEANUP_DELAY_MS);
        }, MAX_SESSION_MS);
      };

      ws.onmessage = (event) => {
        const message = safeParseAsrMessage(String(event.data));
        if (!message) return;

        if (typeof message.code === 'number' && message.code !== 0) {
          stopReasonRef.current = 'socket';
          onError(message.message || `ASR failed with code ${message.code}`);
          shouldKeepListeningRef.current = false;
          setIsActive(false);
          cleanup();
          return;
        }

        if (message.final === 1) {
          const reason = stopReasonRef.current;
          cleanup();
          if (shouldKeepListeningRef.current && reason !== 'manual') scheduleReconnect();
          return;
        }

        const sliceType = getAsrSliceType(message);
        const resultIndex = getAsrResultIndex(message);
        const text = sanitizeTranscriptText(getAsrMessageText(message));

        if (!text) return;

        if (sliceType === 0) {
          previousInterimTextRef.current = '';
          return;
        }

        if (sliceType === 1) {
          if (previousInterimTextRef.current === text) return;
          previousInterimTextRef.current = text;
          onTranscript(text, false);
          return;
        }

        if (sliceType === 2) {
          if (typeof resultIndex === 'number') {
            if (finalizedIndexSetRef.current.has(resultIndex)) return;
            finalizedIndexSetRef.current.add(resultIndex);
          }
          previousInterimTextRef.current = '';
          onTranscript(appendPunctuationIfNeeded(text), true);
          return;
        }

        onTranscript(text, false);
      };

      ws.onerror = () => {
        stopReasonRef.current = 'socket';
        onError('Realtime speech connection error');
      };

      ws.onclose = () => {
        const reason = stopReasonRef.current;
        const isManual = reason === 'manual';
        cleanup();

        if (!isManual && shouldKeepListeningRef.current) {
          scheduleReconnect();
          if (reason !== 'rollover') {
            onError('Realtime speech connection closed');
          }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const audioContext = new AudioContext({ latencyHint: 'interactive' });
      audioContextRef.current = audioContext;
      if (audioContext.state === 'suspended') {
        try {
          await audioContext.resume();
        } catch {}
      }

      const sourceNode = audioContext.createMediaStreamSource(stream);
      sourceNodeRef.current = sourceNode;

      const scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);
      scriptProcessorRef.current = scriptProcessor;

      const sinkNode = audioContext.createGain();
      sinkNode.gain.value = 0;
      sinkNodeRef.current = sinkNode;

      scriptProcessor.onaudioprocess = (audioEvent) => {
        if (!shouldKeepListeningRef.current || !wsRef.current) return;

        const inputData = audioEvent.inputBuffer.getChannelData(0);
        try {
          const resampled = resampleTo16kSync(inputData, audioContext.sampleRate);
          const pcmBuffer = encodeFloat32ToPcm16le(resampled);
          appendAudioChunk(new Uint8Array(pcmBuffer));
        } catch {}
      };

      sourceNode.connect(scriptProcessor);
      scriptProcessor.connect(sinkNode);
      sinkNode.connect(audioContext.destination);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to start realtime speech recognition');
      shouldKeepListeningRef.current = false;
      setIsActive(false);
      cleanup();
    } finally {
      isStartingRef.current = false;
    }
  }, [appendAudioChunk, cleanup, language, onError, onTranscript, resetRuntimeState, scheduleReconnect, sendEndMessage]);

  startRef.current = start;

  useEffect(() => {
    return () => {
      shouldKeepListeningRef.current = false;
      stopReasonRef.current = 'manual';
      clearTimer(reconnectTimerRef);
      clearTimer(shutdownTimerRef);
      clearTimer(sessionTimerRef);
      cleanup();
    };
  }, [cleanup]);

  return {
    isActive,
    start,
    stop,
  };
}
