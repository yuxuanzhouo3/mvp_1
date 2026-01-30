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

type Source = "CN" | "INTL";

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

async function proxyFetch(request: NextRequest, targetOrigin: string, body: unknown) {
  const currentOrigin = new URL(request.url).origin;
  if (currentOrigin === targetOrigin) {
    throw new Error(`Proxy origin equals current origin (${currentOrigin})`);
  }

  const proxySecret = getProxySecret();
  if (!proxySecret) {
    throw new Error("未配置 ADMIN_PROXY_SECRET（或 AI_STATS_PROXY_SECRET），无法跨环境代理请求");
  }

  const targetUrl = new URL("/api/admin/releases/activate", targetOrigin);

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

async function activateCn(id: string, platform: PlatformType, arch: MacOSArchType | null) {
  const app = cloudbase.init({
    env: process.env.CLOUDBASE_ENV_ID || process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID,
    secretId: process.env.CLOUDBASE_SECRET_ID,
    secretKey: process.env.CLOUDBASE_SECRET_KEY,
  });
  const db = app.database();

  const where: any = { platform, arch: arch || null };

  await db
    .collection("releases")
    .where(where)
    .update({ isActive: false, updatedAt: Date.now() })
    .catch(() => null);
  await db.collection("releases").doc(id).update({ isActive: true, updatedAt: Date.now() });
}

async function activateIntl(id: string, platform: PlatformType, arch: MacOSArchType | null) {
  if (!supabaseAdmin) throw new Error("Supabase not configured");

  let q = supabaseAdmin.from("releases").update({ is_active: false, updated_at: new Date().toISOString() }).eq("platform", platform);
  q = arch ? q.eq("arch", arch) : q.is("arch", null);
  await q;

  const { error } = await supabaseAdmin
    .from("releases")
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = (await request.json().catch(() => null)) as any;
    const source = String(payload?.source || "").toUpperCase() as Source;
    const id = typeof payload?.id === "string" ? payload.id : "";
    const platform = parsePlatform(payload?.platform);
    const arch = payload?.arch === null || payload?.arch === undefined ? null : parseArch(payload?.arch);

    if ((source !== "CN" && source !== "INTL") || !id || !platform) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    if (payload?.arch !== null && payload?.arch !== undefined && !arch) {
      return NextResponse.json({ error: "Invalid arch" }, { status: 400 });
    }

    const canProxy = !isInternalProxyRequest(request);

    if (source === "CN") {
      if (hasCnConfig()) {
        await activateCn(id, platform, arch);
      } else if (canProxy) {
        await proxyFetch(request, CN_APP_ORIGIN, payload);
      } else {
        return NextResponse.json({ error: "CN DB not configured" }, { status: 501 });
      }
    }

    if (source === "INTL") {
      if (hasIntlConfig()) {
        await activateIntl(id, platform, arch);
      } else if (canProxy) {
        await proxyFetch(request, INTL_APP_ORIGIN, payload);
      } else {
        return NextResponse.json({ error: "INTL DB not configured" }, { status: 501 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
