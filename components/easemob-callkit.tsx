'use client';

/**
 * 环信 CallKit 通话组件包装器
 * Easemob CallKit wrapper for voice/video calls
 *
 * 核心修复：在组件内部使用 rootStore.client.open() 完成独立认证，
 * 然后将 rootStore.client 作为 chatClient 传递给 CallKit。
 * 这样 CallKit 内部的信令和 RTC token 交换都使用同一个已认证的 client 实例。
 *
 * 之前的问题：外部传入的 callClient 与 Provider 内部的 rootStore.client 不同步，
 * 导致被叫方点击"接通"后 RTC token 交换失败（Provider 内部 client 未登录）。
 *
 * @param appKey       - 环信 AppKey
 * @param language     - 界面语言 'zh' | 'en'
 * @param userId       - 当前用户 ID，用于 rootStore.client 认证
 * @param callKitRef   - CallKit ref，用于外部调用 startSingleCall 等方法
 * @param userInfoProvider  - 用户信息提供器
 * @param groupInfoProvider - 群组信息提供器
 * @param onCallError  - 通话错误回调
 * @param onReady      - 通知父组件 CallKit 是否就绪
 */

import { useState, useEffect, useRef, useCallback, useMemo, type RefObject } from 'react';
import type { CallKitRef } from 'easemob-chat-uikit';


type EasemobCallKitProps = {
  appKey: string;
  language: 'zh' | 'en';
  userId: string;
  callKitRef: RefObject<CallKitRef>;
  userInfoProvider: (userIds: string[]) => Promise<Array<{ userId: string; nickname: string; avatarUrl?: string }>>;
  groupInfoProvider: (groupIds: string[]) => Promise<Array<{ groupId: string; groupName: string }>>;
  onCallError: (error: any) => void;
  onCallStatusChanged?: (status: 'idle' | 'calling' | 'ringing' | 'connected' | 'disconnected') => void;
  onEndCallWithReason?: (reason: string, callInfo: any) => void;
  onReady?: (ready: boolean) => void;
  onResolvedAppKey?: (appKey: string) => void;
};

function EasemobCallKitInner({
  appKey,
  userId,
  callKitRef,
  userInfoProvider,
  groupInfoProvider,
  onCallError,
  onCallStatusChanged,
  onEndCallWithReason,
  onReady,
  onResolvedAppKey,
}: EasemobCallKitProps) {
  const [ready, setReady] = useState(false);
  const authPromiseRef = useRef<Promise<void> | null>(null);
  const { CallKit, useClient } = require('easemob-chat-uikit');
  const client = useClient();

  useEffect(() => {
    if (!userId || !appKey || !client || typeof client.open !== 'function') {
      setReady(false);
      onReady?.(false);
      return;
    }

    let cancelled = false;
    const handlerId = 'CALLKIT_CONN_LISTENER';

    const isClientOpened = () => {
      let opened = false;
      try {
        const isOpenedValue = client?.isOpened;
        if (typeof isOpenedValue === 'function') {
          opened = Boolean(isOpenedValue.call(client));
        } else if (typeof isOpenedValue === 'boolean') {
          opened = isOpenedValue;
        } else if (typeof isOpenedValue === 'number') {
          opened = isOpenedValue > 0;
        } else if (typeof isOpenedValue === 'string') {
          const normalized = isOpenedValue.trim().toLowerCase();
          if (['true', '1', 'yes', 'open', 'opened', 'connected', 'online'].includes(normalized)) {
            opened = true;
          } else if (['false', '0', 'no', 'closed', 'disconnected', 'offline'].includes(normalized)) {
            opened = false;
          }
        }

        if (!opened) {
          const contextUser = client?.context?.userId ?? client?.user ?? client?.userId;
          if (contextUser && (!userId || contextUser === userId)) {
            opened = true;
          } else if (client?.loggedIn || client?.isLogin || client?._connected || client?.loginState) {
            opened = true;
          }
        }
      } catch {
        opened = false;
      }
      return opened;
    };

    client.addEventHandler?.(handlerId, {
      onConnected: () => {
        if (!cancelled) {
          setReady(true);
          onReady?.(true);
        }
      },
      onDisconnected: () => {
        if (!cancelled) {
          setReady(false);
          onReady?.(false);
        }
      },
    });

    const authenticate = async () => {
      try {
        if (isClientOpened()) {
          if (!cancelled) {
            setReady(true);
            onReady?.(true);
          }
          return;
        }

        if (!authPromiseRef.current) {
          authPromiseRef.current = (async () => {
            const response = await fetch('/api/chat/easemob-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId }),
            });

            if (!response.ok) {
              const errorText = await response.text().catch(() => '');
              throw new Error(
                `Failed to get Easemob token (status ${response.status})${errorText ? `: ${errorText}` : ''}`
              );
            }

            const data = await response.json();
            const accessToken = data?.accessToken;
            const serverAppKey = typeof data?.appKey === 'string' ? data.appKey.trim() : '';

            if (serverAppKey && serverAppKey !== appKey) {
              onResolvedAppKey?.(serverAppKey);
              return;
            }

            try {
              await client.open({
                user: userId,
                accessToken,
              });
            } catch (openError: any) {
              const rawMessage =
                typeof openError?.message === 'string' ? openError.message.toLowerCase() : '';
              const alreadyLoggedIn =
                rawMessage.includes('already') ||
                rawMessage.includes('opened') ||
                rawMessage.includes('login') ||
                rawMessage.includes('logged');
              if (!alreadyLoggedIn) {
                throw openError;
              }
            }
          })();
        }

        const pendingAuth = authPromiseRef.current;
        if (pendingAuth) {
          try {
            await pendingAuth;
          } finally {
            if (authPromiseRef.current === pendingAuth) {
              authPromiseRef.current = null;
            }
          }
        }

        const opened = isClientOpened();
        if (!cancelled && opened) {
          setReady(true);
          onReady?.(true);
        } else if (!cancelled) {
          setReady(false);
          onReady?.(false);
        }
      } catch (err) {
        console.error('[EasemobCallKit] Authentication failed:', err);
        if (!cancelled) {
          setReady(false);
          onCallError(err);
          onReady?.(false);
        }
      }
    };

    authenticate();

    return () => {
      cancelled = true;
      // Cleanup connection listener
      try {
        client?.removeEventHandler?.(handlerId);
      } catch {}
    };
  }, [userId, appKey, client, onCallError, onReady, onResolvedAppKey]);


  if (!ready) {
    return null;
  }

  return (
    <CallKit
      ref={callKitRef}
      chatClient={client}
      draggable
      resizable
      managedPosition
      enableRingtone
      showInvitationAvatar
      showInvitationTimer
      autoRejectTime={30}
      logLevel="error"
      userInfoProvider={userInfoProvider}
      groupInfoProvider={groupInfoProvider}
      onCallError={onCallError}
      onCallStatusChanged={onCallStatusChanged}
      onEndCallWithReason={onEndCallWithReason}
    />
  );
}

export default function EasemobCallKit(props: EasemobCallKitProps) {
  const { appKey, language, userId } = props;
  const [resolvedAppKey, setResolvedAppKey] = useState(appKey);
  const prevAppKeyRef = useRef(appKey);
  const providerInitConfig = useMemo(() => ({ appKey: resolvedAppKey }), [resolvedAppKey]);
  const providerLocalConfig = useMemo(
    () => ({
      lng: language,
      fallbackLng: 'en',
    }),
    [language]
  );
  const handleResolvedAppKey = useCallback((nextKey: string) => {
    if (!nextKey) return;
    setResolvedAppKey((prev) => (prev === nextKey ? prev : nextKey));
  }, []);

  useEffect(() => {
    if (appKey && prevAppKeyRef.current !== appKey) {
      prevAppKeyRef.current = appKey;
      setResolvedAppKey(appKey);
    }
  }, [appKey]);

  if (!userId || !resolvedAppKey) return null;

  const { Provider: EasemobProvider } = require('easemob-chat-uikit');

  return (
    <EasemobProvider
      key={resolvedAppKey}
      initConfig={providerInitConfig}
      local={providerLocalConfig}
    >
      <EasemobCallKitInner {...props} appKey={resolvedAppKey} onResolvedAppKey={handleResolvedAppKey} />
    </EasemobProvider>
  );
}
