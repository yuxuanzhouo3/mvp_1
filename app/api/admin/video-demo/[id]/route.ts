/**
 * 管理员视频演示更新与删除 API（支持 source 指定环境）
 * PUT/DELETE /api/admin/video-demo/[id]
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/admin/verify-admin";
import { getDeploymentRegionFromRequest } from "@/lib/config/request-region";
import {
  canServeSourceLocally,
  deleteVideoDemo,
  getOriginForSource,
  parseVideoSource,
  updateVideoDemo,
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const requestForProxy = request.clone();

    const { isAdmin } = await verifyAdminRequest(request);
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing record ID" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const source = parseVideoSource(body?.source) || getDeploymentRegionFromRequest(request);

    if (!canServeSourceLocally(source) && !isInternalProxyRequest(request)) {
      return proxyRequest(requestForProxy, getOriginForSource(source), request);
    }

    if (body.title !== undefined && (typeof body.title !== "string" || !body.title.trim())) {
      return NextResponse.json({ success: false, error: "Invalid field: title" }, { status: 400 });
    }
    if (body.video_url !== undefined && (typeof body.video_url !== "string" || !body.video_url.trim())) {
      return NextResponse.json({ success: false, error: "Invalid field: video_url" }, { status: 400 });
    }

    const updated = await updateVideoDemo(source, id, {
      title: body.title,
      description: body.description,
      video_url: body.video_url,
      is_active: body.is_active,
    });

    return NextResponse.json({ success: true, data: updated, source }, { status: 200 });
  } catch (error: any) {
    const message = error?.message ? String(error.message) : "Internal server error";
    if (/No valid fields to update/i.test(message)) {
      return NextResponse.json({ success: false, error: "No valid fields to update" }, { status: 400 });
    }
    if (/PGRST116/i.test(message) || /no rows/i.test(message)) {
      return NextResponse.json({ success: false, error: "Record not found" }, { status: 404 });
    }
    if (/not found/i.test(message)) {
      return NextResponse.json({ success: false, error: "Record not found" }, { status: 404 });
    }

    console.error("Admin video demo PUT error:", error);
    return NextResponse.json({ success: false, error: message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { isAdmin } = await verifyAdminRequest(request);
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing record ID" }, { status: 400 });
    }

    const url = new URL(request.url);
    const source = parseVideoSource(url.searchParams.get("source")) || getDeploymentRegionFromRequest(request);

    if (!canServeSourceLocally(source) && !isInternalProxyRequest(request)) {
      return proxyRequest(request, getOriginForSource(source), request);
    }

    await deleteVideoDemo(source, id);
    return NextResponse.json({ success: true, source }, { status: 200 });
  } catch (error: any) {
    const message = error?.message ? String(error.message) : "Internal server error";
    if (/PGRST116/i.test(message) || /no rows/i.test(message)) {
      return NextResponse.json({ success: false, error: "Record not found" }, { status: 404 });
    }
    if (/not found/i.test(message)) {
      return NextResponse.json({ success: false, error: "Record not found" }, { status: 404 });
    }

    console.error("Admin video demo DELETE error:", error);
    return NextResponse.json({ success: false, error: message || "Internal server error" }, { status: 500 });
  }
}
