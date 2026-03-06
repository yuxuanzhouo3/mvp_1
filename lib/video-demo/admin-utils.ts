import cloudbase from "@cloudbase/node-sdk";
import { createClient } from "@supabase/supabase-js";
import { getCnServiceDbClient, getIntlServiceDbClient } from "@/lib/db-client";
import { getSupabaseUrl, isPlaceholderSupabaseUrl } from "@/lib/config/supabase-env";

export type VideoDemoSource = "CN" | "INTL";
export type VideoDemoQuerySource = "ALL" | VideoDemoSource;

export type AdminVideoDemo = {
  id: string;
  video_url: string;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  source: VideoDemoSource;
};

export type RegionSourceMeta = {
  source: "local" | "proxy" | "unavailable";
  error?: string | null;
};

export type AdminVideoDemoMeta = {
  cn: RegionSourceMeta;
  intl: RegionSourceMeta;
};

export const CN_APP_ORIGIN =
  process.env.CN_APP_ORIGIN || "https://personalink.mornscience.top";
export const INTL_APP_ORIGIN =
  process.env.INTL_APP_ORIGIN || "https://www.mornhub.lat";

const VIDEO_BUCKET = "video-demos";

export function parseQuerySource(value: string | null): VideoDemoQuerySource {
  const normalized = (value || "").toUpperCase();
  if (normalized === "CN" || normalized === "INTL") return normalized as VideoDemoSource;
  return "ALL";
}

export function parseVideoSource(value: string | null | undefined): VideoDemoSource | null {
  const normalized = (value || "").toUpperCase();
  if (normalized === "CN" || normalized === "INTL") return normalized as VideoDemoSource;
  return null;
}

export function hasCnConfig(): boolean {
  return !!(
    (process.env.CLOUDBASE_ENV_ID || process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID) &&
    process.env.CLOUDBASE_SECRET_ID &&
    process.env.CLOUDBASE_SECRET_KEY
  );
}

export function hasIntlConfig(): boolean {
  const url = getSupabaseUrl();
  return !!(url && !isPlaceholderSupabaseUrl(url) && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function canServeSourceLocally(source: VideoDemoSource): boolean {
  return source === "CN" ? hasCnConfig() : hasIntlConfig();
}

export function getOriginForSource(source: VideoDemoSource): string {
  return source === "CN" ? CN_APP_ORIGIN : INTL_APP_ORIGIN;
}

export function normalizeVideoDemo(raw: any, source: VideoDemoSource): AdminVideoDemo | null {
  const id = String(raw?.id || raw?._id || "").trim();
  const title = String(raw?.title || "").trim();
  const videoUrl = String(raw?.video_url || "").trim();
  if (!id || !title || !videoUrl) return null;

  const createdAt =
    typeof raw?.created_at === "string"
      ? raw.created_at
      : typeof raw?.createdAt === "string"
        ? raw.createdAt
        : new Date().toISOString();
  const updatedAt =
    typeof raw?.updated_at === "string"
      ? raw.updated_at
      : typeof raw?.updatedAt === "string"
        ? raw.updatedAt
        : createdAt;

  return {
    id,
    video_url: videoUrl,
    title,
    description: typeof raw?.description === "string" ? raw.description : "",
    created_at: createdAt,
    updated_at: updatedAt,
    is_active: !!(raw?.is_active ?? raw?.isActive),
    source,
  };
}

function createCloudbaseApp() {
  const envId = process.env.CLOUDBASE_ENV_ID || process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID;
  const secretId = process.env.CLOUDBASE_SECRET_ID;
  const secretKey = process.env.CLOUDBASE_SECRET_KEY;
  if (!envId || !secretId || !secretKey) {
    throw new Error("Cloudbase storage config missing");
  }
  return cloudbase.init({ env: envId, secretId, secretKey });
}

function createSupabaseAdmin() {
  const url = getSupabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || isPlaceholderSupabaseUrl(url)) {
    throw new Error("Supabase storage config missing");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function parseSupabaseRef(ref: string): { bucket: string; path: string } | null {
  if (!ref.startsWith("supabase://")) return null;
  const withoutProtocol = ref.slice("supabase://".length);
  const slashIdx = withoutProtocol.indexOf("/");
  if (slashIdx <= 0) return null;
  const bucket = withoutProtocol.slice(0, slashIdx).trim();
  const path = withoutProtocol.slice(slashIdx + 1).trim();
  if (!bucket || !path) return null;
  return { bucket, path };
}

function isCloudbaseRef(ref: string): boolean {
  return ref.startsWith("cloud://");
}

export async function resolveVideoUrls(
  list: AdminVideoDemo[],
  source: VideoDemoSource
): Promise<AdminVideoDemo[]> {
  if (list.length === 0) return list;

  if (source === "CN") {
    const refs = Array.from(
      new Set(list.map((item) => item.video_url).filter((value) => isCloudbaseRef(value)))
    );
    if (refs.length === 0) return list;

    try {
      const app = createCloudbaseApp();
      const result = await app.getTempFileURL({ fileList: refs });
      const mapping = new Map<string, string>();
      for (const row of result?.fileList || []) {
        if (typeof row?.fileID === "string" && typeof row?.tempFileURL === "string" && row.tempFileURL) {
          mapping.set(row.fileID, row.tempFileURL);
        }
      }

      return list.map((item) => ({
        ...item,
        video_url: mapping.get(item.video_url) || item.video_url,
      }));
    } catch {
      return list;
    }
  }

  const supabaseRefs = Array.from(
    new Set(list.map((item) => item.video_url).filter((value) => value.startsWith("supabase://")))
  );
  if (supabaseRefs.length === 0) return list;

  try {
    const supabase = createSupabaseAdmin();
    const mapping = new Map<string, string>();
    for (const ref of supabaseRefs) {
      const parsed = parseSupabaseRef(ref);
      if (!parsed) continue;
      const { data } = await supabase.storage
        .from(parsed.bucket)
        .createSignedUrl(parsed.path, 60 * 60 * 12);
      if (data?.signedUrl) {
        mapping.set(ref, data.signedUrl);
      }
    }

    return list.map((item) => ({
      ...item,
      video_url: mapping.get(item.video_url) || item.video_url,
    }));
  } catch {
    return list;
  }
}

export async function readVideoDemos(source: VideoDemoSource): Promise<AdminVideoDemo[]> {
  const db = source === "CN" ? await getCnServiceDbClient() : await getIntlServiceDbClient();
  const { data, error } = await db
    .from("video_demos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error?.message || "read failed");
  }

  const normalized = (data || [])
    .map((item: any) => normalizeVideoDemo(item, source))
    .filter(Boolean) as AdminVideoDemo[];

  return resolveVideoUrls(normalized, source);
}

export async function createVideoDemo(
  source: VideoDemoSource,
  payload: {
    title: string;
    description?: string;
    video_url: string;
    is_active?: boolean;
  }
): Promise<AdminVideoDemo> {
  const db = source === "CN" ? await getCnServiceDbClient() : await getIntlServiceDbClient();

  if (payload.is_active === true) {
    await db.from("video_demos").update({ is_active: false }).eq("is_active", true);
  }

  const now = new Date().toISOString();
  const record = {
    title: payload.title.trim(),
    description: (payload.description || "").trim(),
    video_url: payload.video_url.trim(),
    is_active: payload.is_active === true,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await db.from("video_demos").insert(record).select().single();
  if (error || !data) {
    throw new Error(error?.message || "create failed");
  }

  const normalized = normalizeVideoDemo(data, source);
  if (!normalized) {
    throw new Error("create returned invalid data");
  }

  const resolved = await resolveVideoUrls([normalized], source);
  return resolved[0];
}

export async function updateVideoDemo(
  source: VideoDemoSource,
  id: string,
  payload: Partial<{
    title: string;
    description: string;
    video_url: string;
    is_active: boolean;
  }>
): Promise<AdminVideoDemo> {
  const db = source === "CN" ? await getCnServiceDbClient() : await getIntlServiceDbClient();

  const updateFields: Record<string, any> = {};
  if (payload.title !== undefined) updateFields.title = payload.title.trim();
  if (payload.description !== undefined) updateFields.description = payload.description.trim();
  if (payload.video_url !== undefined) updateFields.video_url = payload.video_url.trim();
  if (payload.is_active !== undefined) updateFields.is_active = payload.is_active === true;

  if (Object.keys(updateFields).length === 0) {
    throw new Error("No valid fields to update");
  }

  if (updateFields.is_active === true) {
    await db.from("video_demos").update({ is_active: false }).eq("is_active", true);
  }

  updateFields.updated_at = new Date().toISOString();
  const { data, error } = await db
    .from("video_demos")
    .update(updateFields)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || "update failed");
  }

  const normalized = normalizeVideoDemo(data, source);
  if (!normalized) {
    throw new Error("update returned invalid data");
  }

  const resolved = await resolveVideoUrls([normalized], source);
  return resolved[0];
}

export async function deleteVideoDemo(source: VideoDemoSource, id: string): Promise<void> {
  const db = source === "CN" ? await getCnServiceDbClient() : await getIntlServiceDbClient();
  const { error } = await db.from("video_demos").delete().eq("id", id);
  if (error) {
    throw new Error(error?.message || "delete failed");
  }
}

export function sanitizeFileName(fileName: string): string {
  const base = fileName.replace(/\\/g, "/").split("/").pop() || "video.mp4";
  return base.replace(/[^\w.\-()+\s]/g, "_").slice(0, 180);
}

export async function uploadVideoToStorage(
  source: VideoDemoSource,
  input: { fileName: string; contentType: string; fileBuffer: Buffer }
): Promise<{ videoRef: string; previewUrl: string }> {
  const safeName = sanitizeFileName(input.fileName || "video.mp4");
  const path = `video-demos/${Date.now()}-${safeName}`;

  if (source === "CN") {
    const app = createCloudbaseApp();
    const uploadResult = await app.uploadFile({
      cloudPath: path,
      fileContent: input.fileBuffer,
    });

    const envId = process.env.CLOUDBASE_ENV_ID || process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID || "";
    const fileId =
      typeof uploadResult?.fileID === "string" && uploadResult.fileID
        ? uploadResult.fileID
        : `cloud://${envId}.${path}`;
    const temp = await app.getTempFileURL({ fileList: [fileId] }).catch(() => null);
    const previewUrl =
      temp?.fileList?.[0]?.tempFileURL ||
      `https://${envId}.tcb.qcloud.la/${path}`;

    return {
      videoRef: fileId,
      previewUrl,
    };
  }

  const supabase = createSupabaseAdmin();
  const { error: uploadError } = await supabase.storage
    .from(VIDEO_BUCKET)
    .upload(path, input.fileBuffer, {
      contentType: input.contentType,
      upsert: false,
    });
  if (uploadError) {
    throw new Error(uploadError.message || "Supabase upload failed");
  }

  const ref = `supabase://${VIDEO_BUCKET}/${path}`;
  const { data } = await supabase.storage.from(VIDEO_BUCKET).createSignedUrl(path, 60 * 60 * 12);
  const previewUrl = data?.signedUrl || "";

  return {
    videoRef: ref,
    previewUrl,
  };
}

export async function createIntlVideoSignedUpload(
  fileName: string
): Promise<{
  bucket: string;
  path: string;
  token: string;
  signedUrl: string;
  videoRef: string;
}> {
  const safeName = sanitizeFileName(fileName || "video.mp4");
  const path = `video-demos/${Date.now()}-${safeName}`;
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase.storage
    .from(VIDEO_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data?.token || !data?.signedUrl) {
    throw new Error(error?.message || "Failed to create signed upload url");
  }

  return {
    bucket: VIDEO_BUCKET,
    path,
    token: data.token,
    signedUrl: data.signedUrl,
    videoRef: `supabase://${VIDEO_BUCKET}/${path}`,
  };
}
