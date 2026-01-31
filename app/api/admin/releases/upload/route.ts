import { NextRequest, NextResponse } from "next/server";
import cloudbase from "@cloudbase/node-sdk";
import { Readable } from "node:stream";
import { verifyAdminSessionToken } from "@/utils/session";
import type { MacOSArchType, PlatformType } from "@/lib/config/download.config";

export const dynamic = "force-dynamic";

const CN_APP_ORIGIN =
  process.env.CN_APP_ORIGIN || "https://personalink.mornscience.top";

function hasCnConfig(): boolean {
  return !!(
    (process.env.CLOUDBASE_ENV_ID || process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID) &&
    process.env.CLOUDBASE_SECRET_ID &&
    process.env.CLOUDBASE_SECRET_KEY
  );
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

function parsePlatform(value: string | null): PlatformType | null {
  const v = (value || "").toLowerCase();
  if (v === "android" || v === "ios" || v === "windows" || v === "macos" || v === "linux") return v as PlatformType;
  return null;
}

function parseArch(value: string | null): MacOSArchType | null {
  const v = (value || "").toLowerCase();
  if (v === "intel" || v === "apple-silicon") return v as MacOSArchType;
  return null;
}

function sanitizeFileName(fileName: string): string {
  const base = fileName.replace(/\\/g, "/").split("/").pop() || "file.bin";
  return base.replace(/[^\w.\-()+\s]/g, "_").slice(0, 180);
}

async function proxyUpload(request: NextRequest) {
  const proxySecret = getProxySecret();
  if (!proxySecret) {
    return NextResponse.json({ error: "未配置 ADMIN_PROXY_SECRET（或 AI_STATS_PROXY_SECRET），无法跨环境代理请求" }, { status: 500 });
  }

  const incomingUrl = new URL(request.url);
  const targetUrl = new URL(incomingUrl.pathname + incomingUrl.search, CN_APP_ORIGIN);

  const headers = new Headers(request.headers);
  headers.set("x-admin-proxy-hop", "1");
  headers.set("x-admin-proxy-secret", proxySecret);

  const adminSession = request.cookies.get("admin_session")?.value;
  if (adminSession) headers.set("cookie", `admin_session=${adminSession}`);

  const init: any = {
    method: "POST",
    headers,
    body: request.body,
    cache: "no-store",
    duplex: "half",
  };
  const res = await fetch(targetUrl.toString(), init);

  const text = await res.text().catch(() => "");
  return new NextResponse(text, { status: res.status, headers: { "content-type": res.headers.get("content-type") || "application/json" } });
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasCnConfig() && !isInternalProxyRequest(request)) {
      const proxySecret = getProxySecret();
      if (!proxySecret) {
        return NextResponse.json(
          { error: "CN 未配置 Cloudbase，且未配置 ADMIN_PROXY_SECRET（或 AI_STATS_PROXY_SECRET）用于跨环境代理上传" },
          { status: 501 }
        );
      }
      return proxyUpload(request);
    }

    const url = new URL(request.url);
    const platform = parsePlatform(url.searchParams.get("platform"));
    const arch = parseArch(url.searchParams.get("arch"));
    const version = (url.searchParams.get("version") || "").trim();
    const setActive = url.searchParams.get("setActive") === "1";
    const releaseNotesParam = (url.searchParams.get("releaseNotes") || "").trim();
    const fileSizeParam = url.searchParams.get("fileSize");
    const fileNameParam = (url.searchParams.get("fileName") || "").trim();

    const headerFileName = request.headers.get("x-file-name");
    const rawFileName = fileNameParam || headerFileName || "";
    const fileName = rawFileName ? sanitizeFileName(rawFileName) : "";
    const contentType = request.headers.get("content-type");
    const contentLengthHeader = request.headers.get("content-length");
    const fileSize = contentLengthHeader
      ? Number(contentLengthHeader)
      : (fileSizeParam ? Number(fileSizeParam) : null);

    if (!platform || !version || !fileName) {
      return NextResponse.json({ error: "platform/version/fileName required" }, { status: 400 });
    }
    if (url.searchParams.has("arch") && !arch) {
      return NextResponse.json({ error: "Invalid arch" }, { status: 400 });
    }
    if (!request.body) {
      return NextResponse.json({ error: "Missing body" }, { status: 400 });
    }

    const envId = process.env.CLOUDBASE_ENV_ID || process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID || "";
    const app = cloudbase.init({
      env: envId,
      secretId: process.env.CLOUDBASE_SECRET_ID,
      secretKey: process.env.CLOUDBASE_SECRET_KEY,
    });

    const archPart = arch ? `-${arch}` : "";
    const cloudPath = `releases/${platform}/${version}/${Date.now()}${archPart}-${fileName}`;
    const fileContent = Readable.fromWeb(request.body as any);

    const uploadResult = await app.uploadFile(
      {
        cloudPath,
        fileContent: fileContent as any,
      },
      { timeout: 10 * 60 * 1000 }
    );

    const fileIdOrPath = typeof uploadResult?.fileID === "string" && uploadResult.fileID
      ? uploadResult.fileID
      : `cloud://${envId}.${cloudPath}`;

    const db = app.database();
    const now = Date.now();

    if (setActive) {
      await db
        .collection("releases")
        .where({ platform, arch: arch || null })
        .update({ isActive: false, updatedAt: now })
        .catch(() => null);
    }

    const addRes = await db.collection("releases").add({
      platform,
      arch: arch || null,
      version,
      fileName,
      fileSize: Number.isFinite(fileSize) ? fileSize : null,
      contentType: typeof contentType === "string" ? contentType : null,
      isActive: setActive,
      releaseNotes: releaseNotesParam || null,
      fileIdOrPath,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ ok: true, id: addRes?.id || null, fileIdOrPath, cloudPath });
  } catch (error: any) {
    console.error("[admin/releases/upload] error:", error);
    const message = error?.message ? String(error.message) : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
