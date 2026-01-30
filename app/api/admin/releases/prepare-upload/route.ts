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

  const targetUrl = new URL("/api/admin/releases/prepare-upload", INTL_APP_ORIGIN);

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

function sanitizeFileName(fileName: string): string {
  const base = fileName.replace(/\\/g, "/").split("/").pop() || "file.bin";
  return base.replace(/[^\w.\-()+\s]/g, "_").slice(0, 180);
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
    const fileName = typeof payload?.fileName === "string" ? sanitizeFileName(payload.fileName) : "";

    if (source !== "INTL" || !platform || !version || !fileName) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    if (payload?.arch !== null && payload?.arch !== undefined && !arch) {
      return NextResponse.json({ error: "Invalid arch" }, { status: 400 });
    }

    if (!hasIntlConfig() && !isInternalProxyRequest(request)) {
      const remote = await proxyFetch(request, payload);
      return NextResponse.json(remote);
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 501 });
    }

    const bucket = "releases";
    const now = Date.now();
    const archPart = arch ? `-${arch}` : "";
    const safeName = `${now}${archPart}-${fileName}`;
    const path = `releases/${platform}/${version}/${safeName}`;

    const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUploadUrl(path);
    if (error || !data?.token) {
      return NextResponse.json({ error: error?.message || "Failed to create signed upload url" }, { status: 500 });
    }

    return NextResponse.json({
      bucket,
      path,
      token: data.token,
    });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
