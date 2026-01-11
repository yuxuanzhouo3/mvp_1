/**
 * 视频上传工具
 * 封装视频上传到 Supabase Storage 的逻辑
 */

import { getSupabaseClient } from '@/lib/supabase/client';

// 视频上传配置
const CONFIG = {
  // 最大文件大小 (50MB)
  MAX_FILE_SIZE: 50 * 1024 * 1024,
  // 允许的视频类型
  ALLOWED_TYPES: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
  // 最大录制时长（秒）
  MAX_DURATION: 15,
  // 最大分辨率
  MAX_WIDTH: 720,
  MAX_HEIGHT: 1280,
  // Storage bucket 名称
  BUCKET_NAME: 'chat-videos',
};

export interface VideoUploadResult {
  success: boolean;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  width?: number;
  height?: number;
  fileSize?: number;
  error?: string;
}

export interface VideoUploadOptions {
  roomId: string;
  videoBlob: Blob;
  duration: number;
  thumbnailBlob?: Blob;
}

/**
 * 生成唯一文件名
 */
function generateFileName(roomId: string, extension: string = 'mp4'): string {
  const timestamp = Date.now();
  const uuid = crypto.randomUUID();
  return `${roomId}/${timestamp}_${uuid}.${extension}`;
}

/**
 * 获取视频文件扩展名
 */
function getVideoExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
    'video/x-msvideo': 'avi',
  };
  return extensions[mimeType] || 'mp4';
}

/**
 * 从视频生成缩略图
 */
export async function generateVideoThumbnail(videoBlob: Blob): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    video.onloadeddata = () => {
      // 设置画布大小
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // 跳到第1帧
      video.currentTime = 0.1;
    };

    video.onseeked = () => {
      if (!ctx) {
        resolve(null);
        return;
      }

      // 绘制视频帧
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // 转换为 Blob
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(video.src);
          resolve(blob);
        },
        'image/jpeg',
        0.8
      );
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      resolve(null);
    };

    video.src = URL.createObjectURL(videoBlob);
    video.load();
  });
}

/**
 * 获取视频尺寸信息
 */
export async function getVideoDimensions(videoBlob: Blob): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');

    video.onloadedmetadata = () => {
      const dimensions = {
        width: video.videoWidth,
        height: video.videoHeight,
      };
      URL.revokeObjectURL(video.src);
      resolve(dimensions);
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      resolve(null);
    };

    video.src = URL.createObjectURL(videoBlob);
    video.load();
  });
}

/**
 * 上传视频到 Supabase Storage
 */
export async function uploadChatVideo(options: VideoUploadOptions): Promise<VideoUploadResult> {
  const { roomId, videoBlob, duration, thumbnailBlob } = options;
  const supabase = getSupabaseClient();

  try {
    // 验证文件类型
    if (!CONFIG.ALLOWED_TYPES.includes(videoBlob.type)) {
      return {
        success: false,
        error: `不支持的视频格式。支持: ${CONFIG.ALLOWED_TYPES.join(', ')}`,
      };
    }

    // 验证文件大小
    if (videoBlob.size > CONFIG.MAX_FILE_SIZE) {
      return {
        success: false,
        error: `视频文件大小超过限制 (最大 ${CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB)`,
      };
    }

    // 验证时长
    if (duration > CONFIG.MAX_DURATION) {
      return {
        success: false,
        error: `视频时长超过限制 (最大 ${CONFIG.MAX_DURATION} 秒)`,
      };
    }

    // 获取视频尺寸
    const dimensions = await getVideoDimensions(videoBlob);

    // 生成文件名
    const extension = getVideoExtension(videoBlob.type);
    const videoFileName = generateFileName(roomId, extension);
    const thumbnailFileName = `${roomId}/thumb_${Date.now()}_${crypto.randomUUID()}.jpg`;

    // 上传视频
    const { error: videoError } = await supabase.storage
      .from(CONFIG.BUCKET_NAME)
      .upload(videoFileName, videoBlob, {
        contentType: videoBlob.type,
        upsert: false,
      });

    if (videoError) {
      console.error('上传视频失败:', videoError);
      return {
        success: false,
        error: videoError.message,
      };
    }

    // 获取视频公开 URL
    const { data: videoUrlData } = supabase.storage
      .from(CONFIG.BUCKET_NAME)
      .getPublicUrl(videoFileName);

    let thumbnailUrl: string | undefined;

    // 上传缩略图
    const thumbToUpload = thumbnailBlob || await generateVideoThumbnail(videoBlob);
    if (thumbToUpload) {
      const { error: thumbError } = await supabase.storage
        .from(CONFIG.BUCKET_NAME)
        .upload(thumbnailFileName, thumbToUpload, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (!thumbError) {
        const { data: thumbUrlData } = supabase.storage
          .from(CONFIG.BUCKET_NAME)
          .getPublicUrl(thumbnailFileName);
        thumbnailUrl = thumbUrlData.publicUrl;
      }
    }

    return {
      success: true,
      videoUrl: videoUrlData.publicUrl,
      thumbnailUrl,
      duration: Math.round(duration),
      width: dimensions?.width,
      height: dimensions?.height,
      fileSize: videoBlob.size,
    };
  } catch (err) {
    console.error('上传视频异常:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : '上传失败',
    };
  }
}

/**
 * 删除视频文件
 */
export async function deleteChatVideo(videoUrl: string, thumbnailUrl?: string): Promise<boolean> {
  const supabase = getSupabaseClient();

  try {
    const filesToDelete: string[] = [];

    // 提取视频文件路径
    const videoUrlParts = videoUrl.split(`/${CONFIG.BUCKET_NAME}/`);
    if (videoUrlParts.length >= 2) {
      filesToDelete.push(videoUrlParts[1]);
    }

    // 提取缩略图文件路径
    if (thumbnailUrl) {
      const thumbUrlParts = thumbnailUrl.split(`/${CONFIG.BUCKET_NAME}/`);
      if (thumbUrlParts.length >= 2) {
        filesToDelete.push(thumbUrlParts[1]);
      }
    }

    if (filesToDelete.length === 0) {
      return false;
    }

    const { error } = await supabase.storage
      .from(CONFIG.BUCKET_NAME)
      .remove(filesToDelete);

    if (error) {
      console.error('删除视频失败:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('删除视频异常:', err);
    return false;
  }
}

/**
 * 格式化视频时长显示
 */
export function formatVideoDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const uploadVideoUtils = {
  uploadChatVideo,
  deleteChatVideo,
  generateVideoThumbnail,
  getVideoDimensions,
  formatVideoDuration,
  CONFIG,
};

export default uploadVideoUtils;

