import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/admin/verify-admin";
import {
  createIntlVideoSignedUpload,
  getOriginForSource,
  hasIntlConfig,
  parseVideoSource,
} from "@/lib/video-demo/admin-utils";

export const dynamic = "force-dynamic";

function getProxySecret(): string | null {
  return process.env.ADMIN_PROXY_SECRET || process.env.AI_STATS_PROXY_SECRET || null;
}

function isInternalProxyRequest(request: NextRequest): boolean {
  const hop = request.headers.get("x-admin-proxy-hop");
  const secret = request.headers.get("x-admin-proxy-secret");
  const expected = getProxySecret();
  return hop === "1" && !!expected && secret === expected;
}

async function proxyPrepareUpload(request: NextRequest, body: Record<string, unknown>) {
  const targetOrigin = getOriginForSource("INTL");
  const currentOrigin = new URL(request.url).origin;
  if (currentOrigin === targetOrigin) {
    throw new Error(`Proxy origin equals current origin (${currentOrigin})`);
  }

  const proxySecret = getProxySecret();
  if (!proxySecret) {
    throw new Error("未配置 ADMIN_PROXY_SECRET（或 AI_STATS_PROXY_SECRET），无法跨环境代理请求");
  }

  const targetUrl = new URL("/api/admin/video-demo/prepare-upload", targetOrigin);
  const headers = new Headers();
  headers.set("x-admin-proxy-hop", "1");
  headers.set("x-admin-proxy-secret", proxySecret);
  headers.set("content-type", "application/json");

  const adminSession = request.cookies.get("admin_session")?.value;
  if (adminSession) {
    headers.set("cookie", `admin_session=${adminSession}`);
  }

  const authorization = request.headers.get("authorization");
  if (authorization) {
    headers.set("authorization", authorization);
  }

  const res = await fetch(targetUrl.toString(), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const text = await res.text().catch(() => "");
  return new NextResponse(text, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") || "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const { isAdmin } = await verifyAdminRequest(request);
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const payload = (await request.json().catch(() => null)) as
      | { source?: string; fileName?: string }
      | null;
    if (!payload) {
      return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const source = parseVideoSource(payload.source);
    if (source !== "INTL") {
      return NextResponse.json(
        { success: false, error: "Signed upload currently supports INTL only" },
        { status: 400 }
      );
    }

    const fileName = typeof payload.fileName === "string" ? payload.fileName.trim() : "";
    const proxyBody = { source: "INTL", fileName: fileName || "video.mp4" };

    if (!hasIntlConfig() && !isInternalProxyRequest(request)) {
      return proxyPrepareUpload(request, proxyBody);
    }
    if (!hasIntlConfig()) {
      return NextResponse.json(
        { success: false, error: "INTL Supabase storage config missing" },
        { status: 501 }
      );
    }

    const upload = await createIntlVideoSignedUpload(proxyBody.fileName);
    return NextResponse.json(
      {
        success: true,
        source: "INTL",
        ...upload,
      },
      { status: 200, headers: { "cache-control": "no-store" } }
    );
  } catch (error: any) {
    const message = error?.message ? String(error.message) : "Internal server error";
    console.error("Admin video demo prepare-upload error:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
