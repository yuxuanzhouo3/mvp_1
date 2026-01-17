/**
 * 聊天语音上传 API
 * CN 环境: 腾讯云 Cloudbase 存储
 * INTL 环境: Supabase Storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { isChinaDeployment } from '@/lib/db-client';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_AUDIO_TYPES = ['audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac'];

function createSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function authenticateUser(request: NextRequest): Promise<{ userId: string } | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.split(' ')[1];

  if (isChinaDeployment()) {
    if (token.startsWith('cn_')) {
      const userId = token.substring(3);
      if (userId) return { userId };
    }
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      return { userId: payload.sub || payload.uid };
    } catch {
      return null;
    }
  } else {
    try {
      const supabase = createSupabaseAdmin();
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) return null;
      return { userId: user.id };
    } catch {
      return null;
    }
  }
}

async function uploadToStorage(
  userId: string,
  buffer: Buffer,
  fileType: string,
  chatId: string
): Promise<{ url: string; path: string } | null> {
  const fileExt = fileType.includes('webm') ? 'webm' : fileType.includes('mp3') ? 'mp3' : 'wav';
  const safeName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `chat-audio/${chatId}/${userId}/${safeName}`;

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
      console.error('[CN Storage] Audio upload error:', error);
      return null;
    }
  } else {
    try {
      const supabase = createSupabaseAdmin();
      const { error: uploadError } = await supabase.storage
        .from('chat-audio')
        .upload(filePath, buffer, { contentType: fileType, upsert: false });

      if (uploadError) return null;

      const { data: urlData } = supabase.storage.from('chat-audio').getPublicUrl(filePath);
      return { url: urlData.publicUrl, path: filePath };
    } catch (error) {
      console.error('[INTL Storage] Audio upload error:', error);
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

    const formData = await request.formData();
    const audio = formData.get('audio') as File;
    const chatId = formData.get('chatId') as string;
    const duration = parseInt(formData.get('duration') as string) || 0;

    if (!audio) {
      return NextResponse.json({ success: false, error: 'No audio provided' }, { status: 400 });
    }

    if (!chatId) {
      return NextResponse.json({ success: false, error: 'Chat ID required' }, { status: 400 });
    }

    if (audio.size > MAX_AUDIO_SIZE) {
      return NextResponse.json(
        { success: false, error: 'Audio too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await audio.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await uploadToStorage(authUser.userId, buffer, audio.type, chatId);

    if (!uploadResult) {
      return NextResponse.json({ success: false, error: 'Failed to upload audio' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      audio_url: uploadResult.url,
      duration,
      file_type: audio.type,
      file_size: audio.size
    });
  } catch (error) {
    console.error('Audio upload error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
