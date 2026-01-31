import { NextRequest, NextResponse } from "next/server";
import cloudbase from "@cloudbase/node-sdk";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyAdminSessionToken } from "@/utils/session";
import type { MacOSArchType, PlatformType } from "@/lib/config/download.config";

export const dynamic = "force-dynamic";

const CN_APP_ORIGIN =
  process.env.CN_APP_ORIGIN || "https://personalink.mornscience.top";
const INTL_APP_ORIGIN =
  process.env.INTL_APP_ORIGIN || "https://www.mornhub.lat";

type Source = "ALL" | "CN" | "INTL";

type AdminRelease = {
  id: string;
  platform: PlatformType;
  arch: MacOSArchType | null;
  version: string;
  fileName: string;
  fileSize: number | null;
  contentType: string | null;
  isActive: boolean;
  releaseNotes: string | null;
  createdAt: string | number | null;
  updatedAt: string | number | null;
  source: Exclude<Source, "ALL">;
  storage: {
    provider: "cloudbase" | "supabase";
    fileIdOrPath?: string;
    bucket?: string;
    path?: string;
  };
};

function parseSource(value: string | null): Source {
  const normalized = (value || "").toUpperCase();
  if (normalized === "CN" || normalized === "INTL") return normalized;
  return "ALL";
}

function hasCnConfig(): boolean {
  return !!(
    (process.env.CLOUDBASE_ENV_ID || process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID) &&
    process.env.CLOUDBASE_SECRET_ID &&
    process.env.CLOUDBASE_SECRET_KEY
  );
}

function hasIntlConfig(): boolean {
  return !!supabaseAdmin;
}

function getProxySecret(): string | null {
  return process.env.ADMIN_PROXY_SECRET || process.env.AI_STATS_PROXY_SECRET || null;
}

function isInternalProxyRequest(request: NextRequest): boolean {
  const hop = request.headers.get("x-admin-proxy-hop");
  const secret = request.headers.get("x-admin-proxy-secret");
  const expected = getProxySecret();
  return hop === "1" && !!expected && secret === expected;
}

function isAuthorized(request: NextRequest): boolean {
  if (isInternalProxyRequest(request)) return true;
  const token = request.cookies.get("admin_session")?.value;
  if (!token) return false;
  try {
    return verifyAdminSessionToken(token);
  } catch {
    return false;
  }
}

async function proxyFetch(
  request: NextRequest,
  targetOrigin: string,
  source: Exclude<Source, "ALL">,
  method: "GET"
) {
  const currentOrigin = new URL(request.url).origin;
  if (currentOrigin === targetOrigin) {
    throw new Error(`Proxy origin equals current origin (${currentOrigin})`);
  }

  const proxySecret = getProxySecret();
  if (!proxySecret) {
    throw new Error("未配置 ADMIN_PROXY_SECRET（或 AI_STATS_PROXY_SECRET），无法跨环境代理请求");
  }

  const targetUrl = new URL("/api/admin/releases", targetOrigin);
  targetUrl.searchParams.set("source", source);

  const headers = new Headers();
  headers.set("x-admin-proxy-hop", "1");
  headers.set("x-admin-proxy-secret", proxySecret);

  const adminSession = request.cookies.get("admin_session")?.value;
  if (adminSession) headers.set("cookie", `admin_session=${adminSession}`);

  const res = await fetch(targetUrl.toString(), {
    method,
    headers,
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Proxy failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.json();
}

function normalizePlatform(value: any): PlatformType | null {
  const v = typeof value === "string" ? value.toLowerCase() : value;
  if (v === "android" || v === "ios" || v === "windows" || v === "macos" || v === "linux") {
    return v as PlatformType;
  }
  return null;
}

function normalizeArch(value: any): MacOSArchType | null {
  const v = typeof value === "string" ? value.toLowerCase() : value;
  if (v === "intel" || v === "apple-silicon") return v as MacOSArchType;
  return null;
}

async function readCn(): Promise<AdminRelease[]> {
  const app = cloudbase.init({
    env: process.env.CLOUDBASE_ENV_ID || process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID,
    secretId: process.env.CLOUDBASE_SECRET_ID,
    secretKey: process.env.CLOUDBASE_SECRET_KEY,
  });
  const db = app.database();
  const res =
    (await db
      .collection("releases")
      .orderBy("createdAt", "desc")
      .limit(200)
      .get()
      .catch(() => null)) ||
    (await db
      .collection("releases")
      .orderBy("created_at", "desc")
      .limit(200)
      .get()
      .catch(() => null)) ||
    (await db
      .collection("releases")
      .limit(200)
      .get()
      .catch(() => ({ data: [] as any[] })));

  const out: AdminRelease[] = [];
  for (const item of res.data || []) {
    const platform = normalizePlatform(item?.platform);
    const arch = normalizeArch(item?.arch);
    const version = typeof item?.version === "string" ? item.version : "";
    const fileName =
      (typeof item?.fileName === "string" && item.fileName) ||
      (typeof item?.file_name === "string" && item.file_name) ||
      "";
    const fileIdOrPath =
      (typeof item?.fileIdOrPath === "string" && item.fileIdOrPath) ||
      (typeof item?.fileID === "string" && item.fileID) ||
      (typeof item?.fileId === "string" && item.fileId) ||
      (typeof item?.cloudPath === "string" && item.cloudPath) ||
      null;
    if (!platform || !version.trim() || !fileName.trim()) continue;

    out.push({
      id: String(item?._id || item?.id || ""),
      platform,
      arch,
      version: version.trim(),
      fileName: fileName.trim(),
      fileSize:
        typeof item?.fileSize === "number"
          ? item.fileSize
          : (typeof item?.file_size === "number" ? item.file_size : null),
      contentType:
        typeof item?.contentType === "string"
          ? item.contentType
          : (typeof item?.content_type === "string" ? item.content_type : null),
      isActive: !!(item?.isActive ?? item?.is_active),
      releaseNotes:
        typeof item?.releaseNotes === "string"
          ? item.releaseNotes
          : (typeof item?.release_notes === "string" ? item.release_notes : null),
      createdAt: item?.createdAt ?? item?.created_at ?? null,
      updatedAt: item?.updatedAt ?? item?.updated_at ?? null,
      source: "CN",
      storage: fileIdOrPath ? { provider: "cloudbase", fileIdOrPath } : { provider: "cloudbase" },
    });
  }
  return out;
}

async function readIntl(): Promise<AdminRelease[]> {
  if (!supabaseAdmin) return [];
  const primary = await supabaseAdmin
    .from("releases")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  const fallback = primary.error
    ? await supabaseAdmin.from("releases").select("*").order("createdAt", { ascending: false }).limit(200)
    : null;
  const data = primary.data || fallback?.data || [];

  const out: AdminRelease[] = [];
  for (const item of data || []) {
    const platform = normalizePlatform(item?.platform);
    const arch = normalizeArch(item?.arch);
    const version = typeof item?.version === "string" ? item.version : "";
    const fileName =
      (typeof item?.file_name === "string" && item.file_name) ||
      (typeof item?.fileName === "string" && item.fileName) ||
      "";
    const bucket =
      (typeof item?.storage_bucket === "string" && item.storage_bucket) ||
      (typeof item?.storageBucket === "string" && item.storageBucket) ||
      "";
    const path =
      (typeof item?.storage_path === "string" && item.storage_path) ||
      (typeof item?.storagePath === "string" && item.storagePath) ||
      "";
    const maybeUrl =
      (typeof item?.url === "string" && item.url) ||
      (typeof item?.download_url === "string" && item.download_url) ||
      (typeof item?.downloadUrl === "string" && item.downloadUrl) ||
      "";
    if (!platform || !version.trim() || !fileName.trim()) continue;

    out.push({
      id: String(item?.id || ""),
      platform,
      arch,
      version: version.trim(),
      fileName: fileName.trim(),
      fileSize:
        typeof item?.file_size === "number"
          ? item.file_size
          : (typeof item?.fileSize === "number" ? item.fileSize : null),
      contentType:
        typeof item?.content_type === "string"
          ? item.content_type
          : (typeof item?.contentType === "string" ? item.contentType : null),
      isActive: !!(item?.is_active ?? item?.isActive),
      releaseNotes:
        typeof item?.release_notes === "string"
          ? item.release_notes
          : (typeof item?.releaseNotes === "string" ? item.releaseNotes : null),
      createdAt: typeof item?.created_at === "string" ? item.created_at : (typeof item?.createdAt === "string" ? item.createdAt : null),
      updatedAt: typeof item?.updated_at === "string" ? item.updated_at : (typeof item?.updatedAt === "string" ? item.updatedAt : null),
      source: "INTL",
      storage: bucket && path ? { provider: "supabase", bucket, path } : { provider: "supabase", ...(maybeUrl ? { path: maybeUrl } : {}) },
    });
  }
  return out;
}

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const source = parseSource(url.searchParams.get("source"));
    const canProxy = !isInternalProxyRequest(request);

    let cn: AdminRelease[] | undefined;
    let intl: AdminRelease[] | undefined;

    if (source === "CN" || source === "ALL") {
      if (hasCnConfig()) {
        cn = await readCn();
      } else if (canProxy) {
        try {
          const remote = await proxyFetch(request, CN_APP_ORIGIN, "CN", "GET");
          cn = (remote as any)?.cn as AdminRelease[] | undefined;
        } catch {
          cn = undefined;
        }
      }
    }

    if (source === "INTL" || source === "ALL") {
      if (hasIntlConfig()) {
        intl = await readIntl();
      } else if (canProxy) {
        try {
          const remote = await proxyFetch(request, INTL_APP_ORIGIN, "INTL", "GET");
          intl = (remote as any)?.intl as AdminRelease[] | undefined;
        } catch {
          intl = undefined;
        }
      }
    }

    return NextResponse.json(
      { cn, intl },
      {
        headers: {
          "cache-control": "no-store",
        },
      }
    );
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
