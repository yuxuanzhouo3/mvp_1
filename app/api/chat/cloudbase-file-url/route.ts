import { NextRequest, NextResponse } from 'next/server';
import { isChinaDeployment } from '@/lib/db-client';
import { requireUser } from '@/lib/auth/requireUser';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isChinaDeployment()) {
    return NextResponse.json({ success: false, error: 'Only available in CN region' }, { status: 400 });
  }

  try {
    await requireUser(request);
  } catch {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get('fileId') || '';
  const filePath = searchParams.get('filePath') || '';

  const envId = process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID;
  const secretId = process.env.CLOUDBASE_SECRET_ID;
  const secretKey = process.env.CLOUDBASE_SECRET_KEY;

  if (!envId || !secretId || !secretKey) {
    return NextResponse.json({ success: false, error: 'Cloudbase not configured' }, { status: 500 });
  }

  if (!fileId && !filePath) {
    return NextResponse.json({ success: false, error: 'fileId or filePath is required' }, { status: 400 });
  }

  try {
    // @ts-ignore
    const cloudbase = await import('@cloudbase/node-sdk');
    const app = cloudbase.init({ env: envId, secretId, secretKey });
    const targetId = fileId || `cloud://${envId}.${filePath}`;

    const urlResult = await app.getTempFileURL({ fileList: [targetId] });
    const url = urlResult.fileList?.[0]?.tempFileURL;

    if (!url) {
      return NextResponse.json({ success: false, error: 'Failed to get file URL' }, { status: 500 });
    }

    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error('[Cloudbase File URL] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
