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
  ALLOWED_TYPES: [
    // 常见音频格式
    'audio/webm',
    'audio/mp3',
    'audio/mpeg',
    'audio/ogg',
    'audio/wav',
    'audio/aac',
    'audio/mp4',
    // 扩展格式
    'audio/x-m4a',           // M4A 变体
    'audio/m4a',             // M4A
    'audio/x-wav',           // WAV 变体
    'audio/wave',            // WAV 变体
    'audio/flac',            // FLAC 无损格式
    'audio/x-flac',          // FLAC 变体
    'audio/opus',            // Opus 编码
    'audio/vorbis',          // Vorbis 编码
    'audio/amr',             // AMR (移动设备常用)
    'audio/amr-wb',          // AMR-WB
    'audio/3gpp',            // 3GP 音频
    'audio/3gpp2',           // 3GP2 音频
    'audio/x-aac',           // AAC 变体
    'audio/aacp',            // AAC+
    'audio/mp4a-latm',       // AAC LATM
    'audio/x-caf',           // Apple CAF
    'audio/basic',           // AU/SND 格式
    // 带 codecs 参数的格式（某些浏览器会带上）
    'audio/webm;codecs=opus',
    'audio/webm;codecs=vorbis',
    'audio/ogg;codecs=opus',
    'audio/ogg;codecs=vorbis',
    // 视频容器（某些录音可能被识别为视频）
    'video/webm',
    'video/mp4',
    'video/3gpp',
  ],
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
  // 移除可能的 codecs 参数 (如 "audio/webm;codecs=opus" -> "audio/webm")
  const baseMimeType = mimeType.split(';')[0].trim();

  const extensions: Record<string, string> = {
    // 常见格式
    'audio/webm': 'webm',
    'audio/mp3': 'mp3',
    'audio/mpeg': 'mp3',
    'audio/ogg': 'ogg',
    'audio/wav': 'wav',
    'audio/aac': 'aac',
    'audio/mp4': 'm4a',
    // 扩展格式
    'audio/x-m4a': 'm4a',
    'audio/m4a': 'm4a',
    'audio/x-wav': 'wav',
    'audio/wave': 'wav',
    'audio/flac': 'flac',
    'audio/x-flac': 'flac',
    'audio/opus': 'opus',
    'audio/vorbis': 'ogg',
    'audio/amr': 'amr',
    'audio/amr-wb': 'amr',
    'audio/3gpp': '3gp',
    'audio/3gpp2': '3g2',
    'audio/x-aac': 'aac',
    'audio/aacp': 'aac',
    'audio/mp4a-latm': 'aac',
    'audio/x-caf': 'caf',
    'audio/basic': 'au',
    // 视频容器
    'video/webm': 'webm',
    'video/mp4': 'mp4',
    'video/3gpp': '3gp',
  };
  return extensions[baseMimeType] || 'webm';
}

/**
 * 检查音频类型是否被支持
 */
function isAllowedAudioType(mimeType: string): boolean {
  // 精确匹配
  if (CONFIG.ALLOWED_TYPES.includes(mimeType)) {
    return true;
  }

  // 提取基础 MIME 类型（去除 codecs 等参数）
  const baseMimeType = mimeType.split(';')[0].trim();
  if (CONFIG.ALLOWED_TYPES.includes(baseMimeType)) {
    return true;
  }

  // 检查是否是音频/视频类型的变体
  if (baseMimeType.startsWith('audio/') || baseMimeType.startsWith('video/')) {
    // 对于未知的音频类型，打印日志但允许上传
    console.warn(`未知音频格式 "${mimeType}"，尝试上传...`);
    return true;
  }

  return false;
}

/**
 * 上传语音到 Supabase Storage
 */
export async function uploadChatAudio(options: AudioUploadOptions): Promise<AudioUploadResult> {
  const { roomId, audioBlob, duration } = options;
  const supabase = getSupabaseClient();

  try {
    // 验证文件类型
    if (!isAllowedAudioType(audioBlob.type)) {
      return {
        success: false,
        error: `不支持的音频格式: ${audioBlob.type}`,
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
 * 检查 Storage bucket 是否存在，如不存在则创建
 * 注意：这通常应在后端执行
 */
export async function ensureBucketExists(): Promise<boolean> {
  const supabase = getSupabaseClient();

  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('获取 bucket 列表失败:', listError);
      return false;
    }

    const bucketExists = buckets.some((bucket: { name: string }) => bucket.name === CONFIG.BUCKET_NAME);

    if (!bucketExists) {
      const { error: createError } = await supabase.storage.createBucket(CONFIG.BUCKET_NAME, {
        public: true,
        allowedMimeTypes: CONFIG.ALLOWED_TYPES,
        fileSizeLimit: CONFIG.MAX_FILE_SIZE,
      });

      if (createError) {
        console.error('创建 bucket 失败:', createError);
        return false;
      }
    }

    return true;
  } catch (err) {
    console.error('确保 bucket 存在时出错:', err);
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

const uploadAudioUtils = {
  uploadChatAudio,
  deleteChatAudio,
  formatAudioDuration,
  ensureBucketExists,
  CONFIG,
};

export default uploadAudioUtils;

