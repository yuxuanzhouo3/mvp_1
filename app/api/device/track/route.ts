import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { getDeploymentRegionFromRequest } from "@/lib/config/request-region";
import { getServiceDbClientFromRequest } from "@/lib/db-client";
import { getExternalRequestOrigin } from "@/lib/http/request-origin";
import {
  normalizeTerminalLabel,
  parseUserAgentSignals,
} from "@/lib/observability/device-signals";

export const dynamic = "force-dynamic";

type TrackPayload = {
  platform?: unknown;
  terminal?: unknown;
  clientPlatform?: unknown;
  client_platform?: unknown;
  clientType?: unknown;
  client_type?: unknown;
  entry?: unknown;
  entryType?: unknown;
  entry_type?: unknown;
  channel?: unknown;
  appVersion?: unknown;
  app_version?: unknown;
  clientVersion?: unknown;
  client_version?: unknown;
  version?: unknown;
  deviceType?: unknown;
  device_type?: unknown;
  os?: unknown;
  browser?: unknown;
  metadata?: unknown;
  pathname?: unknown;
  referrer?: unknown;
  language?: unknown;
  bridge?: unknown;
};

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  const allowedOrigins = new Set<string>();
  const externalOrigin = getExternalRequestOrigin(request);
  if (externalOrigin) allowedOrigins.add(externalOrigin);
  try {
    allowedOrigins.add(new URL(request.url).origin);
  } catch {}

  if (allowedOrigins.size === 0) return true;
  return allowedOrigins.has(origin);
}

function safeString(value: unknown, maxLength: number, fallback = "Unknown"): string {
  if (value == null) return fallback;
  const text = (typeof value === "string" ? value : String(value)).trim();
  if (!text) return fallback;
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function optionalString(value: unknown, maxLength: number): string | undefined {
  if (value == null) return undefined;
  const text = (typeof value === "string" ? value : String(value)).trim();
  if (!text) return undefined;
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function safeObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

async function resolveUserId(request: NextRequest): Promise<string | null> {
  try {
    const user = await requireUser(request);
    return user.userId || null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!sameOrigin(request)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as TrackPayload;
    const userAgent = request.headers.get("user-agent") || "";
    const region = getDeploymentRegionFromRequest(request);
    const userId = await resolveUserId(request);
    const now = new Date().toISOString();

    const uaSignals = parseUserAgentSignals(userAgent);
    const platformHint =
      body.platform ||
      body.terminal ||
      body.clientPlatform ||
      body.client_platform ||
      body.clientType ||
      body.client_type ||
      body.entry ||
      body.entryType ||
      body.entry_type ||
      body.channel;
    const platform = normalizeTerminalLabel(platformHint, userAgent);

    const appVersion = safeString(
      body.appVersion ||
        body.app_version ||
        body.clientVersion ||
        body.client_version ||
        body.version,
      80,
      "Unknown"
    );

    const deviceType = safeString(
      body.deviceType || body.device_type,
      50,
      uaSignals.deviceType
    );
    const os = safeString(body.os, 50, uaSignals.os);
    const browser = safeString(body.browser, 80, uaSignals.browser);

    const metadata = {
      ...safeObject(body.metadata),
      pathname: optionalString(body.pathname, 240),
      referrer: optionalString(body.referrer, 240),
      language: optionalString(body.language, 32),
      bridge: safeObject(body.bridge),
      region,
      trackedAt: now,
      terminal: platform,
      source: "device_track",
    };

    const row = {
      user_id: userId,
      region,
      platform,
      client_platform: platform,
      device_type: deviceType,
      os,
      browser,
      app_version: appVersion,
      user_agent: safeString(userAgent, 1024, ""),
      category: "DeviceStats",
      message: "device_track",
      source: "client",
      occurred_at: now,
      metadata,
      data: {
        user_id: userId,
        region,
        platform,
        device_type: deviceType,
        os,
        browser,
        app_version: appVersion,
        user_agent: safeString(userAgent, 1024, ""),
        pathname: metadata.pathname || "",
        referrer: metadata.referrer || "",
        language: metadata.language || "",
      },
    };

    const db = await getServiceDbClientFromRequest(request);
    const writeResult = await db.from("device_stats").insert(row);
    const writeError = writeResult?.error || null;

    if (writeError) {
      await db.from("app_logs").insert({
        user_id: userId,
        level: "info",
        category: "DeviceStats",
        message: "device_track_fallback",
        source: "client",
        occurred_at: now,
        data: row.data,
      });
    }

    return NextResponse.json(
      {
        success: true,
        tracked: true,
        region,
        fallbackToAppLogs: !!writeError,
      },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (error) {
    console.error("[Device Track] POST failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to track device" },
      { status: 500 }
    );
  }
}
