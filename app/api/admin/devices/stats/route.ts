import { NextRequest, NextResponse } from "next/server";
import cloudbase from "@cloudbase/node-sdk";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyAdminSessionToken } from "@/utils/session";

export const dynamic = "force-dynamic";

const CN_APP_ORIGIN =
  process.env.CN_APP_ORIGIN || "https://personalink.mornscience.top";
const INTL_APP_ORIGIN =
  process.env.INTL_APP_ORIGIN || "https://www.mornhub.lat";

const MAX_SUPABASE_ROWS = 10000;
const MAX_CLOUDBASE_ROWS = 3000;
const MAX_DETAIL_RECORDS = 1000;

type RegionTag = "CN" | "INTL";

type StatsSource = "ALL" | "CN" | "INTL";

type SourceState = {
  mode: "local" | "proxy" | "unavailable";
  sampleSize: number;
  error?: string;
};

type DistributionItem = {
  name: string;
  count: number;
  ratio: number;
};

type DailyPoint = {
  date: string;
  count: number;
};

type DeviceDetailRecord = {
  region: RegionTag;
  userId: string | null;
  timestamp: string;
  deviceType: string;
  os: string;
  browser: string;
  platform: string;
  appVersion: string;
  category: string;
  message: string;
};

type SideStats = {
  totalRecords: number;
  uniqueUsers: number;
  lastSeenAt: string | null;
  deviceTypes: DistributionItem[];
  os: DistributionItem[];
  browsers: DistributionItem[];
  platforms: DistributionItem[];
  appVersions: DistributionItem[];
  daily: DailyPoint[];
  recentRecords: DeviceDetailRecord[];
  detailTruncated: boolean;
};

type ParsedDeviceRecord = {
  region: RegionTag;
  userId: string | null;
  timestamp: string;
  deviceType: string;
  os: string;
  browser: string;
  platform: string;
  appVersion: string;
  category: string;
  message: string;
};

function parseStatsSource(value: string | null): StatsSource {
  const normalized = (value || "").toUpperCase();
  if (normalized === "CN" || normalized === "INTL") return normalized;
  return "ALL";
}

function hasCnDbConfig(): boolean {
  return !!(
    process.env.CLOUDBASE_ENV_ID &&
    process.env.CLOUDBASE_SECRET_ID &&
    process.env.CLOUDBASE_SECRET_KEY
  );
}

function hasIntlDbConfig(): boolean {
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

function emptySideStats(): SideStats {
  return {
    totalRecords: 0,
    uniqueUsers: 0,
    lastSeenAt: null,
    deviceTypes: [],
    os: [],
    browsers: [],
    platforms: [],
    appVersions: [],
    daily: lastNDates(14).map((date) => ({ date, count: 0 })),
    recentRecords: [],
    detailTruncated: false,
  };
}

function safeParseJson(value: unknown): Record<string, any> | null {
  if (!value) return null;
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, any>;
  }
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, any>;
    }
  } catch {
    return null;
  }
  return null;
}

function getByPath(input: Record<string, any>, path: string): unknown {
  const keys = path.split(".");
  let current: any = input;
  for (const key of keys) {
    if (!current || typeof current !== "object") return undefined;
    current = current[key];
  }
  return current;
}

function pickFirst(input: Record<string, any>, paths: string[]): unknown {
  for (const path of paths) {
    const value = getByPath(input, path);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function normalizeLabel(value: unknown, fallback = "Unknown"): string {
  if (value == null) return fallback;
  const str = typeof value === "string" ? value : String(value);
  const trimmed = str.trim();
  return trimmed || fallback;
}

function toIsoTime(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (typeof value === "string") {
    const asNum = Number(value);
    if (Number.isFinite(asNum) && value.trim().length >= 10) {
      const byNum = new Date(asNum);
      if (!Number.isNaN(byNum.getTime())) return byNum.toISOString();
    }
    const byStr = new Date(value);
    return Number.isNaN(byStr.getTime()) ? null : byStr.toISOString();
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  return null;
}

function parseUserAgent(uaRaw: string | null): {
  deviceType: string;
  os: string;
  browser: string;
  platform: string;
} {
  const ua = (uaRaw || "").toLowerCase();

  const deviceType = /ipad|tablet/.test(ua)
    ? "Tablet"
    : /iphone|android|mobile|phone/.test(ua)
      ? "Mobile"
      : /macintosh|windows|linux|x11/.test(ua)
        ? "Desktop"
        : "Unknown";

  const os = /android/.test(ua)
    ? "Android"
    : /iphone|ipad|ios/.test(ua)
      ? "iOS"
      : /windows/.test(ua)
        ? "Windows"
        : /macintosh|mac os x/.test(ua)
          ? "macOS"
          : /linux/.test(ua)
            ? "Linux"
            : "Unknown";

  const browser = /micromessenger/.test(ua)
    ? "WeChat"
    : /edg\//.test(ua)
      ? "Edge"
      : /opr\//.test(ua)
        ? "Opera"
        : /firefox\//.test(ua)
          ? "Firefox"
          : /chrome\//.test(ua) && !/edg\//.test(ua)
            ? "Chrome"
            : /safari\//.test(ua) && !/chrome\//.test(ua)
              ? "Safari"
              : "Unknown";

  const platform = /android|iphone|ipad|ios/.test(ua)
    ? "Mobile App/Web"
    : os === "Unknown"
      ? "Unknown"
      : "Web";

  return { deviceType, os, browser, platform };
}

function parseRecord(raw: any, defaultRegion: RegionTag): ParsedDeviceRecord | null {
  const data = safeParseJson(raw?.data) || {};
  const metadata = safeParseJson(raw?.metadata) || {};
  const payload = safeParseJson(raw?.payload) || {};
  const merged = {
    ...(typeof raw === "object" && raw ? raw : {}),
    data,
    metadata,
    payload,
  } as Record<string, any>;

  const regionRaw = normalizeLabel(
    pickFirst(merged, ["region", "source", "data.region", "metadata.region"]),
    defaultRegion
  ).toUpperCase();
  const region: RegionTag = regionRaw === "INTL" ? "INTL" : "CN";

  const userId = normalizeLabel(
    pickFirst(merged, [
      "user_id",
      "userId",
      "uid",
      "data.user_id",
      "data.userId",
      "metadata.user_id",
      "metadata.userId",
    ]),
    ""
  );

  const timestamp =
    toIsoTime(
      pickFirst(merged, [
        "occurred_at",
        "occurredAt",
        "created_at",
        "createdAt",
        "timestamp",
        "ts",
        "data.timestamp",
        "data.ts",
      ])
    ) || new Date().toISOString();

  const uaRaw = pickFirst(merged, [
    "user_agent",
    "userAgent",
    "ua",
    "data.user_agent",
    "data.userAgent",
    "data.ua",
    "metadata.user_agent",
    "metadata.userAgent",
  ]);
  const ua = typeof uaRaw === "string" ? uaRaw : null;
  const uaParsed = parseUserAgent(ua);

  const deviceType = normalizeLabel(
    pickFirst(merged, [
      "device_type",
      "deviceType",
      "device.type",
      "data.device_type",
      "data.deviceType",
      "metadata.device_type",
      "metadata.deviceType",
    ]) || uaParsed.deviceType
  );

  const os = normalizeLabel(
    pickFirst(merged, [
      "os",
      "os_name",
      "operating_system",
      "data.os",
      "data.os_name",
      "data.operating_system",
      "metadata.os",
      "metadata.os_name",
    ]) || uaParsed.os
  );

  const browser = normalizeLabel(
    pickFirst(merged, [
      "browser",
      "browser_name",
      "data.browser",
      "data.browser_name",
      "metadata.browser",
      "metadata.browser_name",
    ]) || uaParsed.browser
  );

  const platform = normalizeLabel(
    pickFirst(merged, [
      "platform",
      "client_platform",
      "data.platform",
      "data.client_platform",
      "metadata.platform",
      "metadata.client_platform",
    ]) || uaParsed.platform
  );

  const appVersion = normalizeLabel(
    pickFirst(merged, [
      "app_version",
      "appVersion",
      "client_version",
      "data.app_version",
      "data.appVersion",
      "metadata.app_version",
      "metadata.appVersion",
    ]),
    "Unknown"
  );

  const category = normalizeLabel(
    pickFirst(merged, ["category", "data.category", "metadata.category"]),
    "Unknown"
  );

  const message = normalizeLabel(
    pickFirst(merged, ["message", "data.message", "metadata.message"]),
    ""
  );

  const hasDeviceSignal =
    deviceType !== "Unknown" ||
    os !== "Unknown" ||
    browser !== "Unknown" ||
    platform !== "Unknown" ||
    appVersion !== "Unknown" ||
    !!ua;

  if (!hasDeviceSignal) return null;

  return {
    region,
    userId: userId || null,
    timestamp,
    deviceType,
    os,
    browser,
    platform,
    appVersion,
    category,
    message,
  };
}

function lastNDates(n: number): string[] {
  const dates: string[] = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split("T")[0]);
  }
  return dates;
}

function makeDistribution(counter: Map<string, number>, topN = 8): DistributionItem[] {
  const total = Array.from(counter.values()).reduce((sum, count) => sum + count, 0);
  if (total <= 0) return [];

  return Array.from(counter.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([name, count]) => ({
      name,
      count,
      ratio: Number(((count / total) * 100).toFixed(2)),
    }));
}

function computeSideStats(rows: any[], region: RegionTag): SideStats {
  const parsedRows: ParsedDeviceRecord[] = [];
  for (const row of rows || []) {
    const parsed = parseRecord(row, region);
    if (parsed) parsedRows.push(parsed);
  }

  const userSet = new Set<string>();
  const typeCounter = new Map<string, number>();
  const osCounter = new Map<string, number>();
  const browserCounter = new Map<string, number>();
  const platformCounter = new Map<string, number>();
  const versionCounter = new Map<string, number>();
  const dailyMap = new Map(lastNDates(14).map((d) => [d, 0]));

  let lastSeen: string | null = null;

  for (const row of parsedRows) {
    if (row.userId) userSet.add(row.userId);

    typeCounter.set(row.deviceType, (typeCounter.get(row.deviceType) || 0) + 1);
    osCounter.set(row.os, (osCounter.get(row.os) || 0) + 1);
    browserCounter.set(row.browser, (browserCounter.get(row.browser) || 0) + 1);
    platformCounter.set(row.platform, (platformCounter.get(row.platform) || 0) + 1);
    versionCounter.set(row.appVersion, (versionCounter.get(row.appVersion) || 0) + 1);

    const day = row.timestamp.split("T")[0];
    if (dailyMap.has(day)) {
      dailyMap.set(day, (dailyMap.get(day) || 0) + 1);
    }

    if (!lastSeen || row.timestamp > lastSeen) {
      lastSeen = row.timestamp;
    }
  }

  return {
    totalRecords: parsedRows.length,
    uniqueUsers: userSet.size,
    lastSeenAt: lastSeen,
    deviceTypes: makeDistribution(typeCounter),
    os: makeDistribution(osCounter),
    browsers: makeDistribution(browserCounter),
    platforms: makeDistribution(platformCounter),
    appVersions: makeDistribution(versionCounter),
    daily: Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count })),
    recentRecords: parsedRows
      .slice()
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, MAX_DETAIL_RECORDS)
      .map((row) => ({
        region: row.region,
        userId: row.userId,
        timestamp: row.timestamp,
        deviceType: row.deviceType,
        os: row.os,
        browser: row.browser,
        platform: row.platform,
        appVersion: row.appVersion,
        category: row.category,
        message: row.message,
      })),
    detailTruncated: parsedRows.length > MAX_DETAIL_RECORDS,
  };
}

function mergeDistribution(
  left: DistributionItem[],
  right: DistributionItem[]
): DistributionItem[] {
  const counter = new Map<string, number>();
  for (const item of left || []) {
    counter.set(item.name, (counter.get(item.name) || 0) + (item.count || 0));
  }
  for (const item of right || []) {
    counter.set(item.name, (counter.get(item.name) || 0) + (item.count || 0));
  }
  return makeDistribution(counter);
}

function mergeDaily(left: DailyPoint[], right: DailyPoint[]): DailyPoint[] {
  const dates = new Map<string, number>();
  for (const point of left || []) {
    dates.set(point.date, (dates.get(point.date) || 0) + (point.count || 0));
  }
  for (const point of right || []) {
    dates.set(point.date, (dates.get(point.date) || 0) + (point.count || 0));
  }
  return Array.from(dates.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }));
}

function mergeSides(cn: SideStats, intl: SideStats): SideStats {
  const cnLastSeen = cn.lastSeenAt || "";
  const intlLastSeen = intl.lastSeenAt || "";

  return {
    totalRecords: (cn.totalRecords || 0) + (intl.totalRecords || 0),
    uniqueUsers: (cn.uniqueUsers || 0) + (intl.uniqueUsers || 0),
    lastSeenAt: cnLastSeen > intlLastSeen ? cn.lastSeenAt : intl.lastSeenAt,
    deviceTypes: mergeDistribution(cn.deviceTypes, intl.deviceTypes),
    os: mergeDistribution(cn.os, intl.os),
    browsers: mergeDistribution(cn.browsers, intl.browsers),
    platforms: mergeDistribution(cn.platforms, intl.platforms),
    appVersions: mergeDistribution(cn.appVersions, intl.appVersions),
    daily: mergeDaily(cn.daily, intl.daily),
    recentRecords: [...(cn.recentRecords || []), ...(intl.recentRecords || [])]
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, MAX_DETAIL_RECORDS),
    detailTruncated:
      cn.detailTruncated ||
      intl.detailTruncated ||
      (cn.totalRecords || 0) + (intl.totalRecords || 0) > MAX_DETAIL_RECORDS,
  };
}

async function querySupabaseRows(): Promise<any[]> {
  if (!supabaseAdmin) return [];

  const tryDeviceStatsByCreatedAt = await supabaseAdmin
    .from("device_stats")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(MAX_SUPABASE_ROWS);
  if (!tryDeviceStatsByCreatedAt.error) {
    return tryDeviceStatsByCreatedAt.data || [];
  }

  const tryDeviceStatsByOccurredAt = await supabaseAdmin
    .from("device_stats")
    .select("*")
    .order("occurred_at", { ascending: false })
    .limit(MAX_SUPABASE_ROWS);
  if (!tryDeviceStatsByOccurredAt.error) {
    return tryDeviceStatsByOccurredAt.data || [];
  }

  const tryDeviceStatsNoOrder = await supabaseAdmin
    .from("device_stats")
    .select("*")
    .limit(MAX_SUPABASE_ROWS);
  if (!tryDeviceStatsNoOrder.error) {
    return tryDeviceStatsNoOrder.data || [];
  }

  const tryAppLogs = await supabaseAdmin
    .from("app_logs")
    .select("id,user_id,category,message,data,occurred_at,created_at")
    .order("occurred_at", { ascending: false })
    .limit(MAX_SUPABASE_ROWS);
  if (!tryAppLogs.error) {
    return tryAppLogs.data || [];
  }

  return [];
}

async function queryCloudbaseCollection(
  db: any,
  collectionName: string,
  limitCount: number
): Promise<any[]> {
  try {
    const res = await db
      .collection(collectionName)
      .orderBy("created_at", "desc")
      .limit(limitCount)
      .get();
    if (Array.isArray(res?.data)) return res.data;
  } catch {
  }

  try {
    const res = await db
      .collection(collectionName)
      .orderBy("occurred_at", "desc")
      .limit(limitCount)
      .get();
    if (Array.isArray(res?.data)) return res.data;
  } catch {
  }

  try {
    const res = await db.collection(collectionName).limit(limitCount).get();
    if (Array.isArray(res?.data)) return res.data;
  } catch {
  }

  return [];
}

async function queryCloudbaseRows(): Promise<any[]> {
  const app = cloudbase.init({
    env: process.env.CLOUDBASE_ENV_ID,
    secretId: process.env.CLOUDBASE_SECRET_ID,
    secretKey: process.env.CLOUDBASE_SECRET_KEY,
  });
  const db = app.database();

  const deviceRows = await queryCloudbaseCollection(db, "device_stats", MAX_CLOUDBASE_ROWS);
  if (deviceRows.length > 0) return deviceRows;

  const appLogRows = await queryCloudbaseCollection(db, "app_logs", MAX_CLOUDBASE_ROWS);
  return appLogRows;
}

async function proxyFetchSide(
  request: NextRequest,
  origin: string,
  source: "CN" | "INTL"
): Promise<any> {
  const target = new URL("/api/admin/devices/stats", origin);
  target.searchParams.set("source", source);

  const headers = new Headers();
  headers.set("accept", "application/json");

  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) headers.set("cookie", cookieHeader);

  const auth = request.headers.get("authorization");
  if (auth) headers.set("authorization", auth);

  const adminSession = request.cookies.get("admin_session")?.value;
  if (adminSession && !cookieHeader) {
    headers.set("cookie", `admin_session=${adminSession}`);
  }

  const secret = getProxySecret();
  if (secret) {
    headers.set("x-admin-proxy-hop", "1");
    headers.set("x-admin-proxy-secret", secret);
  }

  const response = await fetch(target.toString(), {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Proxy failed (${response.status}): ${text.slice(0, 200)}`);
  }

  return response.json();
}

function pickRemoteSide(remote: any, side: "CN" | "INTL"): SideStats {
  if (!remote || typeof remote !== "object") return emptySideStats();

  const normalize = (input: any, sideRegion: RegionTag): SideStats => {
    const base = emptySideStats();
    if (!input || typeof input !== "object") return base;
    return {
      ...base,
      ...input,
      recentRecords: Array.isArray(input.recentRecords)
        ? input.recentRecords.map((row: any) => ({
            region: row?.region === "INTL" ? "INTL" : sideRegion,
            userId: row?.userId || null,
            timestamp: typeof row?.timestamp === "string" ? row.timestamp : new Date().toISOString(),
            deviceType: row?.deviceType || "Unknown",
            os: row?.os || "Unknown",
            browser: row?.browser || "Unknown",
            platform: row?.platform || "Unknown",
            appVersion: row?.appVersion || "Unknown",
            category: row?.category || "Unknown",
            message: row?.message || "",
          }))
        : [],
      detailTruncated: !!input.detailTruncated,
    };
  };

  if (side === "CN") {
    return normalize(remote.cn || remote.combined, "CN");
  }
  return normalize(remote.intl || remote.combined, "INTL");
}

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const source = parseStatsSource(new URL(request.url).searchParams.get("source"));
    const canProxy = !isInternalProxyRequest(request);

    let cn = emptySideStats();
    let intl = emptySideStats();

    const sourceState: { cn: SourceState; intl: SourceState } = {
      cn: { mode: "unavailable", sampleSize: 0 },
      intl: { mode: "unavailable", sampleSize: 0 },
    };

    if (source === "ALL" || source === "CN") {
      if (hasCnDbConfig()) {
        const rows = await queryCloudbaseRows();
        cn = computeSideStats(rows, "CN");
        sourceState.cn = { mode: "local", sampleSize: cn.totalRecords };
      } else if (canProxy) {
        try {
          const remote = await proxyFetchSide(request, CN_APP_ORIGIN, "CN");
          cn = pickRemoteSide(remote, "CN");
          sourceState.cn = { mode: "proxy", sampleSize: cn.totalRecords };
        } catch (error: any) {
          sourceState.cn = {
            mode: "unavailable",
            sampleSize: 0,
            error: error?.message || "CN proxy failed",
          };
        }
      }
    }

    if (source === "ALL" || source === "INTL") {
      if (hasIntlDbConfig()) {
        const rows = await querySupabaseRows();
        intl = computeSideStats(rows, "INTL");
        sourceState.intl = { mode: "local", sampleSize: intl.totalRecords };
      } else if (canProxy) {
        try {
          const remote = await proxyFetchSide(request, INTL_APP_ORIGIN, "INTL");
          intl = pickRemoteSide(remote, "INTL");
          sourceState.intl = { mode: "proxy", sampleSize: intl.totalRecords };
        } catch (error: any) {
          sourceState.intl = {
            mode: "unavailable",
            sampleSize: 0,
            error: error?.message || "INTL proxy failed",
          };
        }
      }
    }

    const combined =
      source === "CN"
        ? cn
        : source === "INTL"
          ? intl
          : mergeSides(cn, intl);

    return NextResponse.json(
      {
        success: true,
        generatedAt: new Date().toISOString(),
        combined,
        cn,
        intl,
        sources: sourceState,
      },
      {
        headers: {
          "cache-control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Device stats error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch device statistics" },
      { status: 500 }
    );
  }
}
