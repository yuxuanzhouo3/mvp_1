/**
 * 聊天视频上传 API
 * CN 环境: 腾讯云 Cloudbase 存储
 * INTL 环境: Supabase Storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { isChinaDeployment } from '@/lib/db-client';
import { createClient } from '@supabase/supabase-js';
import { requireUser } from '@/lib/auth/requireUser';
import { getRequestIp, rateLimit } from '@/lib/security/rateLimit';
import { getSupabaseUrl, isPlaceholderSupabaseUrl } from '@/lib/config/supabase-env';

export const dynamic = 'force-dynamic';

const DEFAULT_MAX_VIDEO_SIZE_MB = 200;
const configuredMaxVideoSizeMbRaw = Number(
  process.env.CHAT_UPLOAD_VIDEO_MAX_MB ??
  process.env.NEXT_PUBLIC_CHAT_MAX_VIDEO_SIZE_MB ??
  DEFAULT_MAX_VIDEO_SIZE_MB
);
const MAX_VIDEO_SIZE_MB = Number.isFinite(configuredMaxVideoSizeMbRaw) && configuredMaxVideoSizeMbRaw > 0
  ? Math.floor(configuredMaxVideoSizeMbRaw)
  : DEFAULT_MAX_VIDEO_SIZE_MB;
const MAX_VIDEO_SIZE = MAX_VIDEO_SIZE_MB * 1024 * 1024;
const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-m4v',
  'video/3gpp',
  'video/mpeg',
];

function createSupabaseAdmin() {
  const url = getSupabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || isPlaceholderSupabaseUrl(url)) {
    throw new Error('Supabase configuration missing');
  }
  return createClient(
    url,
    key,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function authenticateUser(request: NextRequest): Promise<{ userId: string } | null> {
  try {
    const user = await requireUser(request);
    return { userId: user.userId };
  } catch {
    return null;
  }
}

async function uploadToStorage(
  userId: string,
  buffer: Buffer,
  fileType: string,
  chatId: string
): Promise<{ url: string; path: string; fileId?: string } | null> {
  const fileExt = fileType.includes('mp4') ? 'mp4' : fileType.includes('webm') ? 'webm' : 'mov';
  const safeName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `chat-video/${chatId}/${userId}/${safeName}`;

  if (isChinaDeployment()) {
    try {
      const envId = process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID;
      const secretId = process.env.CLOUDBASE_SECRET_ID;
      const secretKey = process.env.CLOUDBASE_SECRET_KEY;

      if (!envId || !secretId || !secretKey) return null;

      // @ts-ignore
      const cloudbase = await import('@cloudbase/node-sdk');
      const app = cloudbase.init({ env: envId, secretId, secretKey });

      const uploadResult = await app.uploadFile({
        cloudPath: filePath,
        fileContent: buffer
      });

      const fileId = uploadResult.fileID || `cloud://${envId}.${filePath}`;
      const urlResult = await app.getTempFileURL({
        fileList: [fileId]
      });

      const url = urlResult.fileList?.[0]?.tempFileURL || `https://${envId}.tcb.qcloud.la/${filePath}`;
      return { url, path: filePath, fileId };
    } catch (error) {
      console.error('[CN Storage] Video upload error:', error);
      return null;
    }
  } else {
    try {
      const supabase = createSupabaseAdmin();
      const { error: uploadError } = await supabase.storage
        .from('chat-video')
        .upload(filePath, buffer, { contentType: fileType, upsert: false });

      if (uploadError) return null;

      const { data: urlData } = supabase.storage.from('chat-video').getPublicUrl(filePath);
      return { url: urlData.publicUrl, path: filePath };
    } catch (error) {
      console.error('[INTL Storage] Video upload error:', error);
      return null;
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await authenticateUser(request);
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const ip = getRequestIp(request) || 'unknown';
    const rlIp = await rateLimit({ key: `rl:chat_upload_video:ip:${ip}`, limit: 30, windowMs: 60_000 });
    const rlUser = await rateLimit({ key: `rl:chat_upload_video:user:${authUser.userId}`, limit: 10, windowMs: 60_000 });
    if (!rlIp.allowed || !rlUser.allowed) {
      const resetAtMs = Math.min(rlIp.resetAtMs, rlUser.resetAtMs);
      const retryAfterSeconds = Math.max(1, Math.ceil((resetAtMs - Date.now()) / 1000));
      return NextResponse.json({ success: false, error: 'Too Many Requests' }, { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } });
    }

    const formData = await request.formData();
    const video = formData.get('video') as File;
    const chatId = formData.get('chatId') as string;
    const duration = parseInt(formData.get('duration') as string) || 0;

    if (!video) {
      return NextResponse.json({ success: false, error: 'No video provided' }, { status: 400 });
    }

    if (!chatId) {
      return NextResponse.json({ success: false, error: 'Chat ID required' }, { status: 400 });
    }

    if (!ALLOWED_VIDEO_TYPES.includes(video.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid video type. Please upload MP4/WebM/MOV/AVI/M4V/3GP/MPEG.' },
        { status: 400 }
      );
    }

    if (video.size > MAX_VIDEO_SIZE) {
      return NextResponse.json(
        { success: false, error: `Video too large. Maximum size is ${MAX_VIDEO_SIZE_MB}MB.` },
        { status: 400 }
      );
    }

    const arrayBuffer = await video.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await uploadToStorage(authUser.userId, buffer, video.type, chatId);

    if (!uploadResult) {
      return NextResponse.json({ success: false, error: 'Failed to upload video' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      video_url: uploadResult.url,
      file_id: uploadResult.fileId,
      file_path: uploadResult.path,
      duration,
      file_type: video.type,
      file_size: video.size
    });
  } catch (error) {
    console.error('Video upload error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
