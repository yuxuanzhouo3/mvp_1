/**
 * 语音上传工具
 * 封装语音上传到 Supabase Storage 的逻辑
 */

import { getSupabaseClient } from '@/lib/supabase/client';

// 语音上传配置
const CONFIG = {
  // 最大文件大小 (10MB)
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  // 允许的音频类型
  ALLOWED_TYPES: ['audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/aac', 'audio/mp4'],
  // 最大录制时长（秒）
  MAX_DURATION: 60,
  // Storage bucket 名称
  BUCKET_NAME: 'chat-audio',
};

export interface AudioUploadResult {
  success: boolean;
  audioUrl?: string;
  duration?: number;
  fileSize?: number;
  error?: string;
}

export interface AudioUploadOptions {
  roomId: string;
  audioBlob: Blob;
  duration: number;
}

/**
 * 生成唯一文件名
 */
function generateFileName(roomId: string, extension: string = 'webm'): string {
  const timestamp = Date.now();
  const uuid = crypto.randomUUID();
  return `${roomId}/${timestamp}_${uuid}.${extension}`;
}

/**
 * 获取音频文件扩展名
 */
function getAudioExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/mp3': 'mp3',
    'audio/mpeg': 'mp3',
    'audio/ogg': 'ogg',
    'audio/wav': 'wav',
    'audio/aac': 'aac',
    'audio/mp4': 'm4a',
  };
  return extensions[mimeType] || 'webm';
}

/**
 * 上传语音到 Supabase Storage
 */
export async function uploadChatAudio(options: AudioUploadOptions): Promise<AudioUploadResult> {
  const { roomId, audioBlob, duration } = options;
  const supabase = getSupabaseClient();

  try {
    // 验证文件类型
    if (!CONFIG.ALLOWED_TYPES.includes(audioBlob.type)) {
      return {
        success: false,
        error: `不支持的音频格式。支持: ${CONFIG.ALLOWED_TYPES.join(', ')}`,
      };
    }

    // 验证文件大小
    if (audioBlob.size > CONFIG.MAX_FILE_SIZE) {
      return {
        success: false,
        error: `音频文件大小超过限制 (最大 ${CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB)`,
      };
    }

    // 验证时长
    if (duration > CONFIG.MAX_DURATION) {
      return {
        success: false,
        error: `语音时长超过限制 (最大 ${CONFIG.MAX_DURATION} 秒)`,
      };
    }

    // 生成文件名
    const extension = getAudioExtension(audioBlob.type);
    const fileName = generateFileName(roomId, extension);

    // 上传音频
    const { data, error: uploadError } = await supabase.storage
      .from(CONFIG.BUCKET_NAME)
      .upload(fileName, audioBlob, {
        contentType: audioBlob.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('上传音频失败:', uploadError);
      return {
        success: false,
        error: uploadError.message,
      };
    }

    // 获取公开 URL
    const { data: urlData } = supabase.storage
      .from(CONFIG.BUCKET_NAME)
      .getPublicUrl(fileName);

    return {
      success: true,
      audioUrl: urlData.publicUrl,
      duration: Math.round(duration),
      fileSize: audioBlob.size,
    };
  } catch (err) {
    console.error('上传音频异常:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : '上传失败',
    };
  }
}

/**
 * 删除语音文件
 */
export async function deleteChatAudio(audioUrl: string): Promise<boolean> {
  const supabase = getSupabaseClient();

  try {
    // 从 URL 中提取文件路径
    const urlParts = audioUrl.split(`/${CONFIG.BUCKET_NAME}/`);
    if (urlParts.length < 2) {
      console.error('无效的音频 URL');
      return false;
    }

    const filePath = urlParts[1];

    const { error } = await supabase.storage
      .from(CONFIG.BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error('删除音频失败:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('删除音频异常:', err);
    return false;
  }
}

/**
 * 格式化音频时长显示
 */
export function formatAudioDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default {
  uploadChatAudio,
  deleteChatAudio,
  formatAudioDuration,
  CONFIG,
};

