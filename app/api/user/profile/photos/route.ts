/**
 * 用户照片 API
 * User Photos API
 * 
 * 支持双环境:
 * - CN 环境: 腾讯云 Cloudbase 存储
 * - INTL 环境: Supabase Storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceDbClient, isChinaDeployment } from '@/lib/db-client';
import { createClient } from '@supabase/supabase-js';
import { requireUser } from '@/lib/auth/requireUser';
import { getSupabaseUrl, isPlaceholderSupabaseUrl } from '@/lib/config/supabase-env';
import {
  validatePhotoBuffer,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
} from '@/lib/services/photoValidation';

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = [...ALLOWED_MIME_TYPES];

// INTL 环境: 创建用于存储操作的 Supabase 客户端
function createSupabaseAdmin() {
  const url = getSupabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || isPlaceholderSupabaseUrl(url)) {
    throw new Error('Supabase configuration missing');
  }
  return createClient(
    url,
    key,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

// 从请求中验证用户身份
async function authenticateUser(request: NextRequest): Promise<{ userId: string; email?: string } | null> {
  try {
    const user = await requireUser(request);
    return { userId: user.userId, email: user.email };
  } catch {
    return null;
  }
}

// 上传文件到存储
async function uploadToStorage(userId: string, buffer: Buffer, fileType: string, fileName: string): Promise<{ url: string; path: string } | null> {
  const fileExt = fileName.split('.').pop();
  const filePath = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  if (isChinaDeployment()) {
    // CN 环境: 使用 Cloudbase 存储
    try {
      const envId = process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID;
      const secretId = process.env.CLOUDBASE_SECRET_ID;
      const secretKey = process.env.CLOUDBASE_SECRET_KEY;

      console.log('[CN Storage] Initializing with env:', envId);

      if (!envId || !secretId || !secretKey) {
        console.error('[CN Storage] Missing credentials:', { envId: !!envId, secretId: !!secretId, secretKey: !!secretKey });
        return null;
      }

      // @ts-ignore
      const cloudbase = await import('@cloudbase/node-sdk');
      const app = cloudbase.init({
        env: envId,
        secretId,
        secretKey,
      });

      const cloudPath = `user-photos/${filePath}`;
      console.log('[CN Storage] Uploading to path:', cloudPath);

      // 使用 app.uploadFile 直接上传
      const uploadResult = await app.uploadFile({
        cloudPath,
        fileContent: buffer
      });

      console.log('[CN Storage] Upload result:', uploadResult);

      // 获取下载链接
      const urlResult = await app.getTempFileURL({
        fileList: [uploadResult.fileID || `cloud://${envId}.${cloudPath}`]
      });

      const url = urlResult.fileList?.[0]?.tempFileURL || `https://${envId}.tcb.qcloud.la/${cloudPath}`;
      console.log('[CN Storage] File URL:', url);

      return { url, path: cloudPath };
    } catch (error) {
      console.error('[CN Storage] Upload error:', error);
      return null;
    }
  } else {
    // INTL 环境: 使用 Supabase Storage
    try {
      const supabase = createSupabaseAdmin();
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('user-photos')
        .upload(filePath, buffer, {
          contentType: fileType,
          upsert: false
        });

      if (uploadError) {
        console.error('[INTL Storage] Upload error:', uploadError);
        return null;
      }

      const { data: urlData } = supabase
        .storage
        .from('user-photos')
        .getPublicUrl(filePath);

      return { url: urlData.publicUrl, path: filePath };
    } catch (error) {
      console.error('[INTL Storage] Upload error:', error);
      return null;
    }
  }
}

// 从存储删除文件
async function deleteFromStorage(filePath: string): Promise<boolean> {
  if (isChinaDeployment()) {
    // CN 环境
    try {
      // @ts-ignore
      const cloudbase = await import('@cloudbase/node-sdk');
      const app = cloudbase.init({
        env: process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID || '',
        secretId: process.env.CLOUDBASE_SECRET_ID,
        secretKey: process.env.CLOUDBASE_SECRET_KEY,
      });

      const envId = process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID;
      const fileID = `cloud://${envId}.${filePath}`;
      await app.deleteFile({ fileList: [fileID] });
      return true;
    } catch (error) {
      console.error('[CN Storage] Delete error:', error);
      return false;
    }
  } else {
    // INTL 环境
    try {
      const supabase = createSupabaseAdmin();
      await supabase.storage.from('user-photos').remove([filePath]);
      return true;
    } catch (error) {
      console.error('[INTL Storage] Delete error:', error);
      return false;
    }
  }
}

// POST - Upload photo
export async function POST(request: NextRequest) {
  try {
    const authUser = await authenticateUser(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const isPrimary = formData.get('is_primary') === 'true';
    const sortOrder = parseInt(formData.get('sort_order') as string || '0', 10);

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file
    if (!ALLOWED_TYPES.includes(file.type as any)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only JPG, PNG, and WebP are allowed.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Convert file to buffer for server-side validation
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate photo using the photoValidation service
    const validationResult = await validatePhotoBuffer(buffer, file.type, file.name);
    if (!validationResult.isValid) {
      return NextResponse.json(
        { success: false, error: validationResult.errorReason },
        { status: 400 }
      );
    }

    const db = await getServiceDbClient();

    // Check photo count
    const { data: existingPhotos, error: countError } = await db
      .from('user_photos')
      .select('id')
      .eq('user_id', authUser.userId);

    const photoCount = existingPhotos?.length || 0;

    // Upload to storage
    const uploadResult = await uploadToStorage(authUser.userId, buffer, file.type, file.name);
    if (!uploadResult) {
      return NextResponse.json(
        { success: false, error: 'Failed to upload photo' },
        { status: 500 }
      );
    }

    // If setting as primary, unset other photos
    if (isPrimary) {
      await db
        .from('user_photos')
        .update({ is_primary: false })
        .eq('user_id', authUser.userId);
    }

    // Insert photo record
    const { data: photoData, error: photoError } = await db
      .from('user_photos')
      .insert({
        user_id: authUser.userId,
        url: uploadResult.url,
        is_primary: isPrimary || photoCount === 0, // First photo is always primary
        sort_order: sortOrder,
        audit_status: 'pending'
      })
      .select()
      .single();

    if (photoError) {
      console.error('Photo record error:', photoError);
      // Clean up uploaded file
      await deleteFromStorage(uploadResult.path);
      
      return NextResponse.json(
        { success: false, error: 'Failed to save photo record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: photoData
    });

  } catch (error) {
    console.error('Photo upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - List user photos
export async function GET(request: NextRequest) {
  try {
    const authUser = await authenticateUser(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = await getServiceDbClient();

    const { data: photos, error } = await db
      .from('user_photos')
      .select('*')
      .eq('user_id', authUser.userId)
      .order('sort_order', { ascending: true });

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch photos' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: photos
    });

  } catch (error) {
    console.error('Get photos error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a photo
export async function DELETE(request: NextRequest) {
  try {
    const authUser = await authenticateUser(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get('id');

    if (!photoId) {
      return NextResponse.json(
        { success: false, error: 'Photo ID required' },
        { status: 400 }
      );
    }

    const db = await getServiceDbClient();

    // Get photo record first
    const { data: photo, error: fetchError } = await db
      .from('user_photos')
      .select('*')
      .eq('id', photoId)
      .eq('user_id', authUser.userId)
      .single();

    if (fetchError || !photo) {
      return NextResponse.json(
        { success: false, error: 'Photo not found' },
        { status: 404 }
      );
    }

    // Delete from storage
    const urlParts = photo.url.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const filePath = isChinaDeployment() 
      ? `user-photos/${authUser.userId}/${fileName}`
      : `${authUser.userId}/${fileName}`;
    await deleteFromStorage(filePath);

    // Delete record
    const { error: deleteError } = await db
      .from('user_photos')
      .delete()
      .eq('id', photoId)
      .eq('user_id', authUser.userId);

    if (deleteError) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete photo' },
        { status: 500 }
      );
    }

    // If deleted photo was primary, set first remaining photo as primary
    if (photo.is_primary) {
      const { data: remainingPhotos } = await db
        .from('user_photos')
        .select('id')
        .eq('user_id', authUser.userId)
        .order('sort_order', { ascending: true })
        .limit(1);

      if (remainingPhotos && remainingPhotos.length > 0) {
        await db
          .from('user_photos')
          .update({ is_primary: true })
          .eq('id', remainingPhotos[0].id);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Photo deleted successfully'
    });

  } catch (error) {
    console.error('Delete photo error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update photo (set primary, reorder)
export async function PATCH(request: NextRequest) {
  try {
    const authUser = await authenticateUser(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { photo_id, is_primary, sort_order } = body;

    if (!photo_id) {
      return NextResponse.json(
        { success: false, error: 'Photo ID required' },
        { status: 400 }
      );
    }

    const db = await getServiceDbClient();

    const updateData: Record<string, any> = {};

    if (is_primary !== undefined) {
      // Unset other photos first
      if (is_primary) {
        await db
          .from('user_photos')
          .update({ is_primary: false })
          .eq('user_id', authUser.userId);
      }
      updateData.is_primary = is_primary;
    }

    if (sort_order !== undefined) {
      updateData.sort_order = sort_order;
    }

    const { data, error } = await db
      .from('user_photos')
      .update(updateData)
      .eq('id', photo_id)
      .eq('user_id', authUser.userId)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to update photo' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Update photo error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
