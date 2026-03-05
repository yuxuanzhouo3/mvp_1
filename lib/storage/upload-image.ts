/**
 * 图片上传工具
 * 封装图片上传到 Supabase Storage 的逻辑
 */

import { getSupabaseClient } from '@/lib/supabase/client';

// 图片上传配置
const CONFIG = {
  // 最大文件大小 (100MB)
  MAX_FILE_SIZE: 100 * 1024 * 1024,
  // 允许的图片类型
  ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  // 压缩质量 (0-1)
  COMPRESS_QUALITY: 0.8,
  // 最大宽度
  MAX_WIDTH: 1920,
  // 最大高度
  MAX_HEIGHT: 1080,
  // 缩略图尺寸
  THUMBNAIL_SIZE: 150,
  // Storage bucket 名称
  BUCKET_NAME: 'chat-images',
};

export interface UploadResult {
  success: boolean;
  imageUrl?: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  fileSize?: number;
  error?: string;
}

export interface ImageUploadOptions {
  roomId: string;
  file: File;
  generateThumbnail?: boolean;
  compress?: boolean;
}

/**
 * 压缩图片
 */
async function compressImage(
  file: File,
  maxWidth: number = CONFIG.MAX_WIDTH,
  maxHeight: number = CONFIG.MAX_HEIGHT,
  quality: number = CONFIG.COMPRESS_QUALITY
): Promise<{ blob: Blob; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      // 计算缩放比例
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      // 创建 Canvas 进行压缩
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve({ blob, width, height });
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * 生成缩略图
 */
async function generateThumbnail(
  file: File,
  size: number = CONFIG.THUMBNAIL_SIZE
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      
      // 计算裁剪尺寸（正方形居中裁剪）
      const minDimension = Math.min(img.width, img.height);
      const sx = (img.width - minDimension) / 2;
      const sy = (img.height - minDimension) / 2;

      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, sx, sy, minDimension, minDimension, 0, 0, size, size);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to generate thumbnail'));
          }
        },
        'image/jpeg',
        0.8
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * 生成唯一文件名
 */
function generateFileName(roomId: string, extension: string = 'jpg'): string {
  const timestamp = Date.now();
  const uuid = crypto.randomUUID();
  return `${roomId}/${timestamp}_${uuid}.${extension}`;
}

/**
 * 上传图片到 Supabase Storage
 */
export async function uploadChatImage(options: ImageUploadOptions): Promise<UploadResult> {
  const { roomId, file, generateThumbnail: shouldGenerateThumbnail = true, compress = true } = options;
  const supabase = getSupabaseClient();

  try {
    // 验证文件类型
    if (!CONFIG.ALLOWED_TYPES.includes(file.type)) {
      return {
        success: false,
        error: `不支持的图片格式。支持: ${CONFIG.ALLOWED_TYPES.join(', ')}`,
      };
    }

    // 验证文件大小
    if (file.size > CONFIG.MAX_FILE_SIZE) {
      return {
        success: false,
        error: 'Sending exceeds the limit.',
      };
    }

    let uploadBlob: Blob = file;
    let width: number = 0;
    let height: number = 0;

    // 压缩图片
    if (compress) {
      try {
        const compressed = await compressImage(file);
        uploadBlob = compressed.blob;
        width = compressed.width;
        height = compressed.height;
      } catch (err) {
        console.error('压缩图片失败，使用原图:', err);
        // 获取原图尺寸
        const img = new Image();
        await new Promise<void>((resolve) => {
          img.onload = () => {
            width = img.width;
            height = img.height;
            resolve();
          };
          img.src = URL.createObjectURL(file);
        });
      }
    }

    // 生成文件名
    const fileName = generateFileName(roomId);
    const thumbnailFileName = `${roomId}/thumb_${Date.now()}_${crypto.randomUUID()}.jpg`;

    // 上传原图
    const { data: imageData, error: imageError } = await supabase.storage
      .from(CONFIG.BUCKET_NAME)
      .upload(fileName, uploadBlob, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (imageError) {
      console.error('上传图片失败:', imageError);
      return {
        success: false,
        error: imageError.message,
      };
    }

    // 获取图片公开 URL
    const { data: imageUrlData } = supabase.storage
      .from(CONFIG.BUCKET_NAME)
      .getPublicUrl(fileName);

    const imageUrl = imageUrlData.publicUrl;
    let thumbnailUrl: string | undefined;

    // 生成并上传缩略图
    if (shouldGenerateThumbnail) {
      try {
        const thumbnailBlob = await generateThumbnail(file);
        
        const { error: thumbError } = await supabase.storage
          .from(CONFIG.BUCKET_NAME)
          .upload(thumbnailFileName, thumbnailBlob, {
            contentType: 'image/jpeg',
            upsert: false,
          });

        if (!thumbError) {
          const { data: thumbUrlData } = supabase.storage
            .from(CONFIG.BUCKET_NAME)
            .getPublicUrl(thumbnailFileName);
          thumbnailUrl = thumbUrlData.publicUrl;
        }
      } catch (err) {
        console.error('生成缩略图失败:', err);
        // 缩略图失败不影响主图
      }
    }

    return {
      success: true,
      imageUrl,
      thumbnailUrl,
      width,
      height,
      fileSize: uploadBlob.size,
    };
  } catch (err) {
    console.error('上传图片异常:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : '上传失败',
    };
  }
}

/**
 * 删除图片（用于撤回消息）
 */
export async function deleteChatImage(imageUrl: string): Promise<boolean> {
  const supabase = getSupabaseClient();

  try {
    // 从 URL 中提取文件路径
    const urlParts = imageUrl.split(`/${CONFIG.BUCKET_NAME}/`);
    if (urlParts.length < 2) {
      console.error('无效的图片 URL');
      return false;
    }

    const filePath = urlParts[1];

    const { error } = await supabase.storage
      .from(CONFIG.BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error('删除图片失败:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('删除图片异常:', err);
    return false;
  }
}

/**
 * 批量上传图片
 */
export async function uploadMultipleImages(
  roomId: string,
  files: File[],
  maxCount: number = 9
): Promise<UploadResult[]> {
  // 限制最大数量
  const filesToUpload = files.slice(0, maxCount);

  const results = await Promise.all(
    filesToUpload.map((file) =>
      uploadChatImage({ roomId, file })
    )
  );

  return results;
}

/**
 * 图片预加载
 */
export function preloadImages(urls: string[]): void {
  urls.forEach((url) => {
    const img = new Image();
    img.src = url;
  });
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

const uploadImageUtils = {
  uploadChatImage,
  deleteChatImage,
  uploadMultipleImages,
  preloadImages,
  ensureBucketExists,
  CONFIG,
};

export default uploadImageUtils;

