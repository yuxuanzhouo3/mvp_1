import { NextRequest, NextResponse } from "next/server";
import cloudbase from "@cloudbase/node-sdk";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyAdminSessionToken } from "@/utils/session";

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

  const targetUrl = new URL("/api/admin/releases/delete", targetOrigin);

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

async function deleteCn(id: string) {
  const app = cloudbase.init({
    env: process.env.CLOUDBASE_ENV_ID || process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID,
    secretId: process.env.CLOUDBASE_SECRET_ID,
    secretKey: process.env.CLOUDBASE_SECRET_KEY,
  });
  const db = app.database();
  const existing = await db
    .collection("releases")
    .doc(id)
    .get()
    .catch(() => ({ data: [] as any[] }));

  const doc = (existing.data || [])[0];
  const fileIdOrPath =
    (typeof doc?.fileIdOrPath === "string" && doc.fileIdOrPath) ||
    (typeof doc?.fileID === "string" && doc.fileID) ||
    (typeof doc?.fileId === "string" && doc.fileId) ||
    (typeof doc?.cloudPath === "string" && doc.cloudPath) ||
    null;
  if (fileIdOrPath) {
    await app.deleteFile({ fileList: [fileIdOrPath] }).catch(() => null);
  }

  await db.collection("releases").doc(id).remove();
}

async function deleteIntl(id: string) {
  if (!supabaseAdmin) throw new Error("Supabase not configured");
  const { data } = await supabaseAdmin
    .from("releases")
    .select("*")
    .eq("id", id)
    .limit(1);

  const row = (data || [])[0];
  const bucket =
    (typeof row?.storage_bucket === "string" && row.storage_bucket) ||
    (typeof row?.storageBucket === "string" && row.storageBucket) ||
    null;
  const path =
    (typeof row?.storage_path === "string" && row.storage_path) ||
    (typeof row?.storagePath === "string" && row.storagePath) ||
    null;
  if (bucket && path) {
    await supabaseAdmin.storage.from(bucket).remove([path]).catch(() => null);
  }

  const { error } = await supabaseAdmin.from("releases").delete().eq("id", id);
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
    if ((source !== "CN" && source !== "INTL") || !id) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const canProxy = !isInternalProxyRequest(request);

    if (source === "CN") {
      if (hasCnConfig()) {
        await deleteCn(id);
      } else if (canProxy) {
        await proxyFetch(request, CN_APP_ORIGIN, payload);
      } else {
        return NextResponse.json({ error: "CN DB not configured" }, { status: 501 });
      }
    }

    if (source === "INTL") {
      if (hasIntlConfig()) {
        await deleteIntl(id);
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
