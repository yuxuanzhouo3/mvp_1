/**
 * 管理员视频演示 API（支持双环境 + 本地上传）
 * GET  /api/admin/video-demo?source=ALL|CN|INTL
 * POST /api/admin/video-demo
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/admin/verify-admin";
import { getDeploymentRegionFromRequest } from "@/lib/config/request-region";
import {
  AdminVideoDemo,
  AdminVideoDemoMeta,
  CN_APP_ORIGIN,
  INTL_APP_ORIGIN,
  canServeSourceLocally,
  createVideoDemo,
  getOriginForSource,
  hasCnConfig,
  hasIntlConfig,
  parseQuerySource,
  parseVideoSource,
  readVideoDemos,
  uploadVideoToStorage,
} from "@/lib/video-demo/admin-utils";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function getProxySecret(): string | null {
  return process.env.ADMIN_PROXY_SECRET || process.env.AI_STATS_PROXY_SECRET || null;
}

function isInternalProxyRequest(request: NextRequest): boolean {
  const hop = request.headers.get("x-admin-proxy-hop");
  const secret = request.headers.get("x-admin-proxy-secret");
  const expected = getProxySecret();
  return hop === "1" && !!expected && secret === expected;
}

async function proxyRequest(request: Request, targetOrigin: string, originalRequest?: NextRequest) {
  const currentOrigin = new URL(request.url).origin;
  if (currentOrigin === targetOrigin) {
    throw new Error(`Proxy origin equals current origin (${currentOrigin})`);
  }

  const proxySecret = getProxySecret();
  if (!proxySecret) {
    throw new Error("未配置 ADMIN_PROXY_SECRET（或 AI_STATS_PROXY_SECRET），无法跨环境代理请求");
  }

  const incoming = new URL(request.url);
  const targetUrl = new URL(incoming.pathname + incoming.search, targetOrigin);
  const headers = new Headers(request.headers);
  headers.set("x-admin-proxy-hop", "1");
  headers.set("x-admin-proxy-secret", proxySecret);

  const adminSessionFromCookie = originalRequest?.cookies.get("admin_session")?.value;
  const cookieHeader = request.headers.get("cookie") || "";
  if (adminSessionFromCookie) {
    headers.set("cookie", `admin_session=${adminSessionFromCookie}`);
  } else if (cookieHeader) {
    headers.set("cookie", cookieHeader);
  }

  const init: any = {
    method: request.method,
    headers,
    cache: "no-store",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    init.duplex = "half";
  }

  const res = await fetch(targetUrl.toString(), init);
  const body = await res.text().catch(() => "");
  return new NextResponse(body, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") || "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

async function proxyFetchJson(
  request: NextRequest,
  targetOrigin: string,
  source: "CN" | "INTL"
) {
  const currentOrigin = new URL(request.url).origin;
  if (currentOrigin === targetOrigin) {
    throw new Error(`Proxy origin equals current origin (${currentOrigin})`);
  }

  const proxySecret = getProxySecret();
  if (!proxySecret) {
    throw new Error("未配置 ADMIN_PROXY_SECRET（或 AI_STATS_PROXY_SECRET），无法跨环境代理请求");
  }

  const targetUrl = new URL("/api/admin/video-demo", targetOrigin);
  targetUrl.searchParams.set("source", source);

  const headers = new Headers();
  headers.set("x-admin-proxy-hop", "1");
  headers.set("x-admin-proxy-secret", proxySecret);

  const adminSession = request.cookies.get("admin_session")?.value;
  if (adminSession) {
    headers.set("cookie", `admin_session=${adminSession}`);
  }

  const authorization = request.headers.get("authorization");
  if (authorization) {
    headers.set("authorization", authorization);
  }

  const res = await fetch(targetUrl.toString(), {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Proxy failed (${res.status}): ${text.slice(0, 200)}`);
  }

  return res.json();
}

export async function GET(request: NextRequest) {
  try {
    const { isAdmin } = await verifyAdminRequest(request);
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const source = parseQuerySource(new URL(request.url).searchParams.get("source"));
    const canProxy = !isInternalProxyRequest(request);
    const currentOrigin = new URL(request.url).origin;

    let cn: AdminVideoDemo[] = [];
    let intl: AdminVideoDemo[] = [];
    const meta: AdminVideoDemoMeta = {
      cn: { source: "unavailable", error: null },
      intl: { source: "unavailable", error: null },
    };

    if (source === "CN" || source === "ALL") {
      const targetOrigin = CN_APP_ORIGIN;
      if (hasCnConfig()) {
        try {
          cn = await readVideoDemos("CN");
          meta.cn = { source: "local", error: null };
        } catch (e: any) {
          meta.cn = { source: "unavailable", error: e?.message ? String(e.message).slice(0, 200) : "CN local read failed" };
        }
      } else if (canProxy && currentOrigin !== targetOrigin) {
        try {
          const payload = await proxyFetchJson(request, targetOrigin, "CN");
          cn = Array.isArray(payload?.cn)
            ? payload.cn
            : Array.isArray(payload?.data)
              ? payload.data
              : [];
          meta.cn = payload?.meta?.cn || { source: "proxy", error: null };
        } catch {
          meta.cn = { source: "unavailable", error: "CN proxy failed" };
        }
      }
    }

    if (source === "INTL" || source === "ALL") {
      const targetOrigin = INTL_APP_ORIGIN;
      if (hasIntlConfig()) {
        try {
          intl = await readVideoDemos("INTL");
          meta.intl = { source: "local", error: null };
        } catch (e: any) {
          meta.intl = { source: "unavailable", error: e?.message ? String(e.message).slice(0, 200) : "INTL local read failed" };
        }
      } else if (canProxy && currentOrigin !== targetOrigin) {
        try {
          const payload = await proxyFetchJson(request, targetOrigin, "INTL");
          intl = Array.isArray(payload?.intl)
            ? payload.intl
            : Array.isArray(payload?.data)
              ? payload.data
              : [];
          meta.intl = payload?.meta?.intl || { source: "proxy", error: null };
        } catch {
          meta.intl = { source: "unavailable", error: "INTL proxy failed" };
        }
      }
    }

    const all = [...cn, ...intl].sort((a, b) => {
      const ta = Date.parse(a.created_at || "") || 0;
      const tb = Date.parse(b.created_at || "") || 0;
      return tb - ta;
    });

    if (source === "CN") {
      return NextResponse.json(
        { success: true, source, data: cn, cn, meta },
        { status: 200, headers: { "cache-control": "no-store" } }
      );
    }

    if (source === "INTL") {
      return NextResponse.json(
        { success: true, source, data: intl, intl, meta },
        { status: 200, headers: { "cache-control": "no-store" } }
      );
    }

    return NextResponse.json(
      { success: true, source: "ALL", data: all, cn, intl, meta },
      { status: 200, headers: { "cache-control": "no-store" } }
    );
  } catch (error) {
    console.error("Admin video demo GET error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const requestForProxy = request.clone();

    const { isAdmin } = await verifyAdminRequest(request);
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const source = parseVideoSource(String(form.get("source") || "").trim()) || getDeploymentRegionFromRequest(request);
      const title = String(form.get("title") || "").trim();
      const description = String(form.get("description") || "").trim();
      const isActive = String(form.get("is_active") || "").toLowerCase() === "true";
      const file = form.get("file") as File | null;

      if (!canServeSourceLocally(source) && !isInternalProxyRequest(request)) {
        return proxyRequest(requestForProxy, getOriginForSource(source), request);
      }

      if (!title) {
        return NextResponse.json({ success: false, error: "Missing required field: title" }, { status: 400 });
      }
      if (!file) {
        return NextResponse.json({ success: false, error: "Missing required field: file" }, { status: 400 });
      }

      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const upload = await uploadVideoToStorage(source, {
        fileName: file.name,
        contentType: file.type || "video/mp4",
        fileBuffer,
      });

      const created = await createVideoDemo(source, {
        title,
        description,
        is_active: isActive,
        video_url: upload.videoRef,
      });

      return NextResponse.json(
        { success: true, data: created, source, upload_preview_url: upload.previewUrl },
        { status: 201 }
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const source = parseVideoSource(body?.source) || getDeploymentRegionFromRequest(request);
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const videoUrl = typeof body?.video_url === "string" ? body.video_url.trim() : "";
    const description = typeof body?.description === "string" ? body.description.trim() : "";
    const isActive = body?.is_active === true;

    if (!canServeSourceLocally(source) && !isInternalProxyRequest(request)) {
      return proxyRequest(requestForProxy, getOriginForSource(source), request);
    }

    if (!title) {
      return NextResponse.json({ success: false, error: "Missing required field: title" }, { status: 400 });
    }
    if (!videoUrl) {
      return NextResponse.json({ success: false, error: "Missing required field: video_url" }, { status: 400 });
    }

    const created = await createVideoDemo(source, {
      title,
      description,
      is_active: isActive,
      video_url: videoUrl,
    });

    return NextResponse.json({ success: true, data: created, source }, { status: 201 });
  } catch (error) {
    console.error("Admin video demo POST error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
