import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextRequest, NextResponse } from "next/server";
import cloudbase from "@cloudbase/node-sdk";
import { verifyAdminSessionToken } from "@/utils/session";

/**
 * 获取数据统计信息 - 支持 CN 和 INTL 环境
 */
export const dynamic = "force-dynamic";

const CN_APP_ORIGIN =
  process.env.CN_APP_ORIGIN || "https://personalink.mornscience.top";
const INTL_APP_ORIGIN =
  process.env.INTL_APP_ORIGIN || "https://www.mornhub.lat";

type StatsSource = "ALL" | "CN" | "INTL";

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

type GrowthPoint = { date: string; count: number };
type RevenuePoint = { date: string; amount: number };

type SideStats = {
  users: number;
  todayUsers: number;
  orders: number;
  todayOrders: number;
  totalRevenue: number;
  todayRevenue: number;
  userGrowth: GrowthPoint[];
  revenueGrowth: RevenuePoint[];
};

function lastNDates(n: number): string[] {
  const dates: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

async function computeCnStats(startOfToday: Date): Promise<SideStats> {
  const toIsoDate = (d: Date) => d.toISOString().split("T")[0];
  const sumNumbers = (values: unknown[]): number =>
    values.reduce<number>((sum, v) => sum + (Number(v) || 0), 0);

  const pickBetter = <T extends { count?: number; sum?: number }>(a: T, b: T) => {
    const aCount = a.count ?? 0;
    const bCount = b.count ?? 0;
    if (aCount === bCount) {
      const aSum = a.sum ?? 0;
      const bSum = b.sum ?? 0;
      return aSum >= bSum ? a : b;
    }
    return aCount > bCount ? a : b;
  };

  const app = cloudbase.init({
    env: process.env.CLOUDBASE_ENV_ID,
    secretId: process.env.CLOUDBASE_SECRET_ID,
    secretKey: process.env.CLOUDBASE_SECRET_KEY,
  });
  const db = app.database();
  const _ = db.command;

  const getCnCountForDay = async (collection: string, date: Date) => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const startMs = start.getTime();
    const endMs = end.getTime();
    const startIso = start.toISOString();
    const endIso = end.toISOString();

    const byCreatedAt = await db
      .collection(collection)
      .where({ createdAt: _.gte(startMs).and(_.lt(endMs)) })
      .count()
      .then((r: any) => ({ count: r.total || 0 }))
      .catch(() => ({ count: 0 }));

    const byCreatedAtIso = await db
      .collection(collection)
      .where({ created_at: _.gte(startIso).and(_.lt(endIso)) })
      .count()
      .then((r: any) => ({ count: r.total || 0 }))
      .catch(() => ({ count: 0 }));

    return pickBetter(byCreatedAt, byCreatedAtIso).count || 0;
  };

  const getCnPaymentsSumForDay = async (date: Date) => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const startMs = start.getTime();
    const endMs = end.getTime();
    const startIso = start.toISOString();
    const endIso = end.toISOString();

    const statusFilter = _.in(["success", "completed"]);

    const byCreatedAt = await db
      .collection("payments")
      .where({ status: statusFilter, createdAt: _.gte(startMs).and(_.lt(endMs)) })
      .field({ amount: true })
      .get()
      .then((r: any) => ({
        count: Array.isArray(r.data) ? r.data.length : 0,
        sum: sumNumbers((r.data || []).map((x: any) => x?.amount)),
      }))
      .catch(() => ({ count: 0, sum: 0 }));

    const byCreatedAtIso = await db
      .collection("payments")
      .where({ status: statusFilter, created_at: _.gte(startIso).and(_.lt(endIso)) })
      .field({ amount: true })
      .get()
      .then((r: any) => ({
        count: Array.isArray(r.data) ? r.data.length : 0,
        sum: sumNumbers((r.data || []).map((x: any) => x?.amount)),
      }))
      .catch(() => ({ count: 0, sum: 0 }));

    return pickBetter(byCreatedAt, byCreatedAtIso).sum || 0;
  };

  const usersResult = await db.collection("users").count();
  const users = usersResult.total || 0;
  const todayUsers = await getCnCountForDay("users", startOfToday);

  const ordersResult = await db.collection("payments").count();
  const orders = ordersResult.total || 0;
  const todayOrders = await getCnCountForDay("payments", startOfToday);

  const statusFilter = _.in(["success", "completed"]);
  const revenueResult = await db
    .collection("payments")
    .where({ status: statusFilter })
    .field({ amount: true })
    .get()
    .then((r: any) => ({
      sum: sumNumbers((r.data || []).map((x: any) => x?.amount)),
    }))
    .catch(() => ({ sum: 0 }));
  const totalRevenue = revenueResult.sum || 0;
  const todayRevenue = await getCnPaymentsSumForDay(startOfToday);

  const userGrowth: GrowthPoint[] = [];
  const revenueGrowth: RevenuePoint[] = [];

  for (const dateStr of lastNDates(7)) {
    const d = new Date(dateStr);
    userGrowth.push({ date: dateStr, count: await getCnCountForDay("users", d) });
    revenueGrowth.push({ date: dateStr, amount: await getCnPaymentsSumForDay(d) });
  }

  const normalizedUserGrowth = userGrowth.map((p) => ({
    date: p.date || toIsoDate(new Date()),
    count: p.count,
  }));

  return {
    users,
    todayUsers,
    orders,
    todayOrders,
    totalRevenue,
    todayRevenue,
    userGrowth: normalizedUserGrowth,
    revenueGrowth,
  };
}

async function computeIntlStats(startOfToday: Date): Promise<SideStats> {
  if (!supabaseAdmin) {
    return {
      users: 0,
      todayUsers: 0,
      orders: 0,
      todayOrders: 0,
      totalRevenue: 0,
      todayRevenue: 0,
      userGrowth: lastNDates(7).map((d) => ({ date: d, count: 0 })),
      revenueGrowth: lastNDates(7).map((d) => ({ date: d, amount: 0 })),
    };
  }

  const { count: totalUsers } = await supabaseAdmin
    .from("users")
    .select("id", { count: "exact", head: true });
  const users = totalUsers || 0;

  const { count: todayUsersCount } = await supabaseAdmin
    .from("users")
    .select("id", { count: "exact", head: true })
    .gte("created_at", startOfToday.toISOString());
  const todayUsers = todayUsersCount || 0;

  const { count: totalOrders } = await supabaseAdmin
    .from("payments")
    .select("id", { count: "exact", head: true });
  const orders = totalOrders || 0;

  const { count: todayOrdersCount } = await supabaseAdmin
    .from("payments")
    .select("id", { count: "exact", head: true })
    .gte("created_at", startOfToday.toISOString());
  const todayOrders = todayOrdersCount || 0;

  const { data: revenueData } = await supabaseAdmin
    .from("payments")
    .select("amount")
    .eq("status", "completed");
  const totalRevenue =
    revenueData?.reduce((sum, item: any) => sum + (parseFloat(item.amount) || 0), 0) || 0;

  const { data: todayRevenueData } = await supabaseAdmin
    .from("payments")
    .select("amount")
    .eq("status", "completed")
    .gte("created_at", startOfToday.toISOString());
  const todayRevenue =
    todayRevenueData?.reduce((sum, item: any) => sum + (parseFloat(item.amount) || 0), 0) || 0;

  const userGrowth: GrowthPoint[] = [];
  const revenueGrowth: RevenuePoint[] = [];

  for (const dateStr of lastNDates(7)) {
    const start = new Date(dateStr);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const { count } = await supabaseAdmin
      .from("users")
      .select("id", { count: "exact", head: true })
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString());

    userGrowth.push({ date: dateStr, count: count || 0 });

    const { data } = await supabaseAdmin
      .from("payments")
      .select("amount")
      .eq("status", "completed")
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString());
    const dayRevenue =
      data?.reduce((sum, item: any) => sum + (parseFloat(item.amount) || 0), 0) || 0;
    revenueGrowth.push({ date: dateStr, amount: dayRevenue });
  }

  return {
    users,
    todayUsers,
    orders,
    todayOrders,
    totalRevenue,
    todayRevenue,
    userGrowth,
    revenueGrowth,
  };
}

async function proxyFetchSide(
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
    throw new Error(
      "未配置 ADMIN_PROXY_SECRET（或 AI_STATS_PROXY_SECRET），无法跨环境代理请求"
    );
  }

  const targetUrl = new URL("/api/admin/stats", targetOrigin);
  targetUrl.searchParams.set("source", source);

  const headers = new Headers();
  headers.set("x-admin-proxy-hop", "1");
  headers.set("x-admin-proxy-secret", proxySecret);

  const adminSession = request.cookies.get("admin_session")?.value;
  if (adminSession) {
    headers.set("cookie", `admin_session=${adminSession}`);
  }

  const res = await fetch(targetUrl.toString(), { method: "GET", headers, cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Proxy failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.json();
}

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const source = parseStatsSource(url.searchParams.get("source"));

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const canProxy = !isInternalProxyRequest(request);

    let cn: SideStats | null = null;
    let intl: SideStats | null = null;

    if (source === "CN" || source === "ALL") {
      if (hasCnDbConfig()) {
        cn = await computeCnStats(startOfToday);
      } else if (canProxy) {
        try {
          const remote = await proxyFetchSide(request, CN_APP_ORIGIN, "CN");
          cn = {
            users: remote?.cn?.totalUsers || 0,
            todayUsers: remote?.cn?.todayUsers || 0,
            orders: remote?.cn?.totalOrders || 0,
            todayOrders: remote?.cn?.todayOrders || 0,
            totalRevenue: remote?.cn?.totalRevenueCny || 0,
            todayRevenue: remote?.cn?.todayRevenueCny || 0,
            userGrowth: (remote?.userGrowth || []).map((p: any) => ({
              date: p.date,
              count: p.cn || 0,
            })),
            revenueGrowth: (remote?.revenueGrowth || []).map((p: any) => ({
              date: p.date,
              amount: p.cn || 0,
            })),
          };
        } catch (e) {
          cn = null;
        }
      }
    }

    if (source === "INTL" || source === "ALL") {
      if (hasIntlDbConfig()) {
        intl = await computeIntlStats(startOfToday);
      } else if (canProxy) {
        try {
          const remote = await proxyFetchSide(request, INTL_APP_ORIGIN, "INTL");
          intl = {
            users: remote?.intl?.totalUsers || 0,
            todayUsers: remote?.intl?.todayUsers || 0,
            orders: remote?.intl?.totalOrders || 0,
            todayOrders: remote?.intl?.todayOrders || 0,
            totalRevenue: remote?.intl?.totalRevenueUsd || 0,
            todayRevenue: remote?.intl?.todayRevenueUsd || 0,
            userGrowth: (remote?.userGrowth || []).map((p: any) => ({
              date: p.date,
              count: p.intl || 0,
            })),
            revenueGrowth: (remote?.revenueGrowth || []).map((p: any) => ({
              date: p.date,
              amount: p.intl || 0,
            })),
          };
        } catch (e) {
          intl = null;
        }
      }
    }

    const dates = lastNDates(7);
    const cnUserMap = new Map((cn?.userGrowth || []).map((p) => [p.date, p.count]));
    const intlUserMap = new Map((intl?.userGrowth || []).map((p) => [p.date, p.count]));

    const cnRevMap = new Map((cn?.revenueGrowth || []).map((p) => [p.date, p.amount]));
    const intlRevMap = new Map((intl?.revenueGrowth || []).map((p) => [p.date, p.amount]));

    const userGrowth = dates.map((date) => {
      const cnCount = cnUserMap.get(date) || 0;
      const intlCount = intlUserMap.get(date) || 0;
      return { date, cn: cnCount, intl: intlCount, total: cnCount + intlCount };
    });

    const revenueGrowth = dates.map((date) => ({
      date,
      cn: cnRevMap.get(date) || 0,
      intl: intlRevMap.get(date) || 0,
    }));

    return NextResponse.json(
      {
        cn: {
          totalUsers: cn?.users || 0,
          todayUsers: cn?.todayUsers || 0,
          totalOrders: cn?.orders || 0,
          todayOrders: cn?.todayOrders || 0,
          totalRevenueCny: cn?.totalRevenue || 0,
          todayRevenueCny: cn?.todayRevenue || 0,
        },
        intl: {
          totalUsers: intl?.users || 0,
          todayUsers: intl?.todayUsers || 0,
          totalOrders: intl?.orders || 0,
          todayOrders: intl?.todayOrders || 0,
          totalRevenueUsd: intl?.totalRevenue || 0,
          todayRevenueUsd: intl?.todayRevenue || 0,
        },
        total: {
          totalUsers: (cn?.users || 0) + (intl?.users || 0),
          todayUsers: (cn?.todayUsers || 0) + (intl?.todayUsers || 0),
          totalOrders: (cn?.orders || 0) + (intl?.orders || 0),
          todayOrders: (cn?.todayOrders || 0) + (intl?.todayOrders || 0),
          totalRevenueCny: cn?.totalRevenue || 0,
          todayRevenueCny: cn?.todayRevenue || 0,
          totalRevenueUsd: intl?.totalRevenue || 0,
          todayRevenueUsd: intl?.todayRevenue || 0,
        },
        userGrowth,
        revenueGrowth,
      },
      {
        headers: {
          "cache-control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("获取统计数据失败:", error);
    return NextResponse.json(
      { error: "获取统计数据失败" },
      { status: 500 }
    );
  }
}
