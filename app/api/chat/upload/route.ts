/**
 * 聊天文件上传 API
 * Chat File Upload API
 *
 * CN 环境: 腾讯云 Cloudbase 存储
 * INTL 环境: Supabase Storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceDbClient, isChinaDeployment } from '@/lib/db-client';
import { createClient } from '@supabase/supabase-js';
import { requireUser } from '@/lib/auth/requireUser';
import { getRequestIp, rateLimit } from '@/lib/security/rateLimit';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/zip',
  'application/x-rar-compressed',
];

function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase configuration missing');
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
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
  fileName: string,
  chatId: string
): Promise<{ url: string; path: string } | null> {
  const fileExt = fileName.split('.').pop() || 'bin';
  const safeName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `chat-files/${chatId}/${userId}/${safeName}`;

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

      const urlResult = await app.getTempFileURL({
        fileList: [uploadResult.fileID || `cloud://${envId}.${filePath}`]
      });

      const url = urlResult.fileList?.[0]?.tempFileURL || `https://${envId}.tcb.qcloud.la/${filePath}`;
      return { url, path: filePath };
    } catch (error) {
      console.error('[CN Storage] Upload error:', error);
      return null;
    }
  } else {
    try {
      const supabase = createSupabaseAdmin();
      const { error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(filePath, buffer, { contentType: fileType, upsert: false });

      if (uploadError) return null;

      const { data: urlData } = supabase.storage.from('chat-files').getPublicUrl(filePath);
      return { url: urlData.publicUrl, path: filePath };
    } catch (error) {
      console.error('[INTL Storage] Upload error:', error);
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
    const rlIp = await rateLimit({ key: `rl:chat_upload_file:ip:${ip}`, limit: 30, windowMs: 60_000 });
    const rlUser = await rateLimit({ key: `rl:chat_upload_file:user:${authUser.userId}`, limit: 10, windowMs: 60_000 });
    if (!rlIp.allowed || !rlUser.allowed) {
      const resetAtMs = Math.min(rlIp.resetAtMs, rlUser.resetAtMs);
      const retryAfterSeconds = Math.max(1, Math.ceil((resetAtMs - Date.now()) / 1000));
      return NextResponse.json({ success: false, error: 'Too Many Requests' }, { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const chatId = formData.get('chatId') as string;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    if (!chatId) {
      return NextResponse.json({ success: false, error: 'Chat ID required' }, { status: 400 });
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only PDF, DOC, DOCX, TXT, ZIP, RAR are allowed.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await uploadToStorage(
      authUser.userId,
      buffer,
      file.type,
      file.name,
      chatId
    );

    if (!uploadResult) {
      return NextResponse.json({ success: false, error: 'Failed to upload file' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      file_url: uploadResult.url,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size
    });
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
