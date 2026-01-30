import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyAdminSessionToken } from "@/utils/session";
import type { MacOSArchType, PlatformType } from "@/lib/config/download.config";

export const dynamic = "force-dynamic";

const INTL_APP_ORIGIN =
  process.env.INTL_APP_ORIGIN || "https://www.mornhub.lat";

type Source = "INTL";

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

async function proxyFetch(request: NextRequest, body: unknown) {
  const currentOrigin = new URL(request.url).origin;
  if (currentOrigin === INTL_APP_ORIGIN) {
    throw new Error(`Proxy origin equals current origin (${currentOrigin})`);
  }

  const proxySecret = getProxySecret();
  if (!proxySecret) {
    throw new Error("未配置 ADMIN_PROXY_SECRET（或 AI_STATS_PROXY_SECRET），无法跨环境代理请求");
  }

  const targetUrl = new URL("/api/admin/releases/register", INTL_APP_ORIGIN);

  const headers = new Headers();
  headers.set("x-admin-proxy-hop", "1");
  headers.set("x-admin-proxy-secret", proxySecret);
  headers.set("content-type", "application/json");

  const adminSession = request.cookies.get("admin_session")?.value;
  if (adminSession) headers.set("cookie", `admin_session=${adminSession}`);

  const res = await fetch(targetUrl.toString(), {
    method: "POST",
    headers,
    body: JSON.stringify(body ?? {}),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Proxy failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.json();
}

function parsePlatform(value: any): PlatformType | null {
  if (value === "android" || value === "ios" || value === "windows" || value === "macos" || value === "linux") {
    return value as PlatformType;
  }
  return null;
}

function parseArch(value: any): MacOSArchType | null {
  if (value === "intel" || value === "apple-silicon") return value as MacOSArchType;
  return null;
}

async function upsertIntlRelease(input: {
  platform: PlatformType;
  arch: MacOSArchType | null;
  version: string;
  fileName: string;
  bucket: string;
  path: string;
  fileSize: number | null;
  contentType: string | null;
  releaseNotes: string | null;
  setActive: boolean;
}) {
  if (!supabaseAdmin) throw new Error("Supabase not configured");

  let q = supabaseAdmin
    .from("releases")
    .select("id")
    .eq("platform", input.platform)
    .eq("version", input.version)
    .limit(1);
  q = input.arch ? q.eq("arch", input.arch) : q.is("arch", null);
  const existing = await q;
  const id = (existing.data || [])[0]?.id as string | undefined;

  const payload: any = {
    platform: input.platform,
    arch: input.arch,
    version: input.version,
    file_name: input.fileName,
    storage_bucket: input.bucket,
    storage_path: input.path,
    file_size: input.fileSize,
    content_type: input.contentType,
    release_notes: input.releaseNotes,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    const { error } = await supabaseAdmin.from("releases").update(payload).eq("id", id);
    if (error) throw error;
  } else {
    payload.created_at = new Date().toISOString();
    const { data, error } = await supabaseAdmin.from("releases").insert(payload).select("id").limit(1);
    if (error) throw error;
    const insertedId = (data || [])[0]?.id as string | undefined;
    if (insertedId) {
      (payload as any).id = insertedId;
    }
  }

  const finalId = id || (payload as any).id;
  if (input.setActive && finalId) {
    let deact = supabaseAdmin
      .from("releases")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("platform", input.platform);
    deact = input.arch ? deact.eq("arch", input.arch) : deact.is("arch", null);
    await deact;
    await supabaseAdmin
      .from("releases")
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq("id", finalId);
  }

  return finalId;
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = (await request.json().catch(() => null)) as any;
    const source = String(payload?.source || "").toUpperCase() as Source;
    const platform = parsePlatform(payload?.platform);
    const arch = payload?.arch === null || payload?.arch === undefined ? null : parseArch(payload?.arch);
    const version = typeof payload?.version === "string" ? payload.version.trim() : "";
    const fileName = typeof payload?.fileName === "string" ? payload.fileName.trim() : "";
    const bucket = typeof payload?.bucket === "string" ? payload.bucket.trim() : "";
    const path = typeof payload?.path === "string" ? payload.path.trim() : "";
    const fileSize = typeof payload?.fileSize === "number" ? payload.fileSize : null;
    const contentType = typeof payload?.contentType === "string" ? payload.contentType : null;
    const releaseNotes = typeof payload?.releaseNotes === "string" ? payload.releaseNotes : null;
    const setActive = payload?.setActive === true;

    if (source !== "INTL" || !platform || !version || !fileName || !bucket || !path) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    if (payload?.arch !== null && payload?.arch !== undefined && !arch) {
      return NextResponse.json({ error: "Invalid arch" }, { status: 400 });
    }

    if (!hasIntlConfig() && !isInternalProxyRequest(request)) {
      const remote = await proxyFetch(request, payload);
      return NextResponse.json(remote);
    }

    const id = await upsertIntlRelease({
      platform,
      arch,
      version,
      fileName,
      bucket,
      path,
      fileSize,
      contentType,
      releaseNotes,
      setActive,
    });

    return NextResponse.json({ ok: true, id });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

