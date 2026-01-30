import { NextRequest, NextResponse } from 'next/server';
import { getDownloadConfig, type PlatformType, type MacOSArchType } from '@/lib/config/download.config';
import { getDeploymentRegionFromRequest } from '@/lib/config/request-region';
import { isChinaDeployment } from '@/lib/config/deployment.config';
import { createServiceClient } from '@/lib/supabase/server';

type Region = 'CN' | 'INTL';

function parseRegion(value: string | null): Region | null {
  if (!value) return null;
  const v = value.toUpperCase();
  if (v === 'CN' || v === 'INTL') return v as Region;
  return null;
}

function parsePlatform(value: string | null): PlatformType | null {
  if (!value) return null;
  const v = value.toLowerCase();
  if (v === 'android' || v === 'ios' || v === 'windows' || v === 'macos' || v === 'linux') return v as PlatformType;
  return null;
}

function parseArch(value: string | null): MacOSArchType | null {
  if (!value) return null;
  const v = value.toLowerCase();
  if (v === 'intel' || v === 'apple-silicon') return v as MacOSArchType;
  return null;
}

function parseSupabaseUri(uri: string): { bucket: string; path: string } | null {
  if (!uri.startsWith('supabase://')) return null;
  const rest = uri.slice('supabase://'.length);
  const idx = rest.indexOf('/');
  if (idx <= 0) return null;
  const bucket = rest.slice(0, idx);
  const path = rest.slice(idx + 1);
  if (!bucket || !path) return null;
  return { bucket, path };
}

async function getCloudbaseTempUrl(fileIdOrPath: string): Promise<string | null> {
  try {
    // @ts-ignore
    const cloudbase = await import('@cloudbase/node-sdk');
    const env = process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID || '';
    if (!env) return null;
    const app = cloudbase.init({
      env,
      secretId: process.env.CLOUDBASE_SECRET_ID,
      secretKey: process.env.CLOUDBASE_SECRET_KEY,
    });

    // @ts-ignore - getTempFileURL exists in Cloudbase SDK
    const result = await app.getTempFileURL({ fileList: [fileIdOrPath] });
    const url = result?.fileList?.[0]?.tempFileURL;
    return typeof url === 'string' && url.length > 0 ? url : null;
  } catch {
    return null;
  }
}

async function resolveCnActiveFileId(platform: PlatformType, arch: MacOSArchType | null): Promise<string | null> {
  try {
    // @ts-ignore
    const cloudbase = await import('@cloudbase/node-sdk');
    const env = process.env.CLOUDBASE_ENV_ID || process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID || '';
    if (!env || !process.env.CLOUDBASE_SECRET_ID || !process.env.CLOUDBASE_SECRET_KEY) return null;
    const app = cloudbase.init({
      env,
      secretId: process.env.CLOUDBASE_SECRET_ID,
      secretKey: process.env.CLOUDBASE_SECRET_KEY,
    });
    const db = app.database();
    const res = await db
      .collection('releases')
      .where({ platform, arch: arch || null, isActive: true })
      .orderBy('updatedAt', 'desc')
      .limit(1)
      .get()
      .catch(() => ({ data: [] as any[] }));
    const row = (res.data || [])[0];
    const fileIdOrPath = typeof row?.fileIdOrPath === 'string' ? row.fileIdOrPath : null;
    return fileIdOrPath && fileIdOrPath.trim() ? fileIdOrPath.trim() : null;
  } catch {
    return null;
  }
}

async function resolveIntlActiveStorage(
  supabase: ReturnType<typeof createServiceClient>,
  platform: PlatformType,
  arch: MacOSArchType | null
): Promise<{ bucket: string; path: string } | null> {
  try {
    let q = supabase
      .from('releases')
      .select('storage_bucket, storage_path')
      .eq('platform', platform)
      .eq('is_active', true)
      .limit(1);
    q = arch ? q.eq('arch', arch) : q.is('arch', null);
    const { data } = await q;
    const row = (data || [])[0] as any;
    const bucket = typeof row?.storage_bucket === 'string' ? row.storage_bucket : '';
    const path = typeof row?.storage_path === 'string' ? row.storage_path : '';
    if (!bucket || !path) return null;
    return { bucket, path };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const regionParam = parseRegion(url.searchParams.get('region'));
    const platform = parsePlatform(url.searchParams.get('platform'));
    const arch = parseArch(url.searchParams.get('arch'));

    const region: Region = regionParam || getDeploymentRegionFromRequest(request);
    if (!platform) {
      return NextResponse.json({ error: 'platform required' }, { status: 400 });
    }

    if (region === 'CN') {
      if (!isChinaDeployment()) {
        return NextResponse.json({ error: 'Not CN deployment' }, { status: 400 });
      }
      const activeFileId = await resolveCnActiveFileId(platform, arch);
      if (activeFileId) {
        const tempUrl = await getCloudbaseTempUrl(activeFileId);
        if (tempUrl) return NextResponse.redirect(tempUrl, { status: 302 });
      }

      const config = getDownloadConfig(region);
      const download = config.downloads.find((d) => {
        if (platform === 'macos' && arch) return d.platform === platform && d.arch === arch;
        return d.platform === platform && !d.arch;
      });
      if (!download || download.available === false) {
        return NextResponse.json({ error: 'Not available' }, { status: 404 });
      }
      if (!download.fileID) return NextResponse.json({ error: 'Missing fileID' }, { status: 500 });
      const tempUrl = await getCloudbaseTempUrl(download.fileID);
      if (!tempUrl) {
        return NextResponse.json({ error: 'Failed to resolve download url' }, { status: 500 });
      }
      return NextResponse.redirect(tempUrl, { status: 302 });
    }

    const supabase = createServiceClient();
    const active = await resolveIntlActiveStorage(supabase, platform, arch);
    if (active) {
      const { data, error } = await supabase.storage
        .from(active.bucket)
        .createSignedUrl(active.path, 60 * 60);
      if (!error && data?.signedUrl) return NextResponse.redirect(data.signedUrl, { status: 302 });
    }

    const config = getDownloadConfig(region);
    const download = config.downloads.find((d) => {
      if (platform === 'macos' && arch) return d.platform === platform && d.arch === arch;
      return d.platform === platform && !d.arch;
    });
    if (!download || download.available === false) {
      return NextResponse.json({ error: 'Not available' }, { status: 404 });
    }
    if (!download.url) return NextResponse.json({ error: 'Missing url' }, { status: 500 });
    if (!download.url.startsWith('supabase://')) {
      return NextResponse.redirect(download.url, { status: 302 });
    }

    const parsed = parseSupabaseUri(download.url);
    if (!parsed) return NextResponse.json({ error: 'Invalid supabase uri' }, { status: 500 });

    const { data, error } = await supabase.storage
      .from(parsed.bucket)
      .createSignedUrl(parsed.path, 60 * 60);

    if (error || !data?.signedUrl) {
      return NextResponse.json({ error: error?.message || 'Failed to create signed url' }, { status: 500 });
    }

    return NextResponse.redirect(data.signedUrl, { status: 302 });
  } catch (error: any) {
    const message = error?.message ? String(error.message) : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
