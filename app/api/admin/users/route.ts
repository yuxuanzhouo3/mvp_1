import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextRequest, NextResponse } from "next/server";
import cloudbase from "@cloudbase/node-sdk";
import { verifyAdminSessionToken } from "@/utils/session";

export const dynamic = "force-dynamic";

const CN_APP_ORIGIN =
  process.env.CN_APP_ORIGIN || "https://personalink.mornscience.top";
const INTL_APP_ORIGIN =
  process.env.INTL_APP_ORIGIN || "https://www.mornhub.lat";

type UsersSource = "ALL" | "CN" | "INTL";
type CreatedSort = "created_desc" | "created_asc";

type NormalizedUser = {
  id: string;
  region: "CN" | "INTL";
  username?: string | null;
  email?: string | null;
  phone?: string | null;
  gender?: string | null;
  birth_date?: string | null;
  age?: number | null;
  city_name?: string | null;
  education_level?: string | null;
  occupation?: string | null;
  mbti?: string | null;
  account_status?: string | null;
  verification_level?: number | null;
  last_active_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  login_methods?: string[];
  is_wechat_login?: boolean;
  raw?: any;
};

function parseUsersSource(value: string | null): UsersSource {
  const normalized = (value || "").toUpperCase();
  if (normalized === "CN" || normalized === "INTL") return normalized;
  return "ALL";
}

function parseCreatedSort(value: string | null): CreatedSort {
  const normalized = (value || "").toLowerCase();
  if (normalized === "created_asc") return "created_asc";
  return "created_desc";
}

function toIsoOrNull(value: any): string | null {
  if (!value) return null;
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  return null;
}

function toStringOrNull(value: any): string | null {
  if (value == null) return null;
  const s = typeof value === "string" ? value : String(value);
  const t = s.trim();
  return t ? t : null;
}

function toNumberOrNull(value: any): number | null {
  const n = typeof value === "number" ? value : value == null ? NaN : Number(value);
  return Number.isFinite(n) ? n : null;
}

function toStringArray(value: any): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        const s = typeof item === "string" ? item : item == null ? "" : String(item);
        return s.trim();
      })
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return [];
    return s
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeLoginMethod(method: string): string {
  const normalized = method.trim().toLowerCase();
  if (!normalized) return "";
  if (
    normalized === "wechat" ||
    normalized === "weixin" ||
    normalized === "wx" ||
    normalized.includes("wechat") ||
    normalized.includes("weixin")
  ) {
    return "wechat";
  }
  if (
    normalized === "email" ||
    normalized === "mail" ||
    normalized.includes("email")
  ) {
    return "email";
  }
  return normalized;
}

function buildLoginFlags(input: {
  email: string | null;
  authProviders: string[];
  wechatOpenid: string | null;
  wechatUnionid: string | null;
}) {
  const methods = new Set<string>();
  const providers = input.authProviders
    .map((item) => normalizeLoginMethod(item))
    .filter(Boolean);

  for (const provider of providers) methods.add(provider);
  if (input.email) methods.add("email");

  const isWechatLogin =
    !!input.wechatOpenid || !!input.wechatUnionid || providers.includes("wechat");
  if (isWechatLogin) methods.add("wechat");

  return {
    loginMethods: Array.from(methods),
    isWechatLogin,
  };
}

function calcAge(birthDate: any): number | null {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 && age < 150 ? age : null;
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

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function getCnConfigMissing(): string[] {
  const missing: string[] = [];
  if (!process.env.CLOUDBASE_ENV_ID) missing.push("CLOUDBASE_ENV_ID");
  if (!process.env.CLOUDBASE_SECRET_ID) missing.push("CLOUDBASE_SECRET_ID");
  if (!process.env.CLOUDBASE_SECRET_KEY) missing.push("CLOUDBASE_SECRET_KEY");
  return missing;
}

function getIntlConfigMissing(): string[] {
  const missing: string[] = [];
  if (!(process.env.SUPABASE_URL ?? process.env["NEXT_PUBLIC_SUPABASE_URL"]))
    missing.push("SUPABASE_URL");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  return missing;
}

function normalizeCnUser(doc: any): NormalizedUser {
  const id =
    toStringOrNull(doc?.id) ||
    toStringOrNull(doc?._id) ||
    toStringOrNull(doc?.user_id) ||
    "";

  const profile =
    (doc?.profile && typeof doc.profile === "object" ? doc.profile : null) ||
    (doc?.user_profile && typeof doc.user_profile === "object" ? doc.user_profile : null) ||
    (doc?.userProfile && typeof doc.userProfile === "object" ? doc.userProfile : null) ||
    (doc?.user_profiles && typeof doc.user_profiles === "object" ? doc.user_profiles : null) ||
    null;

  const username =
    toStringOrNull(doc?.username) ||
    toStringOrNull(doc?.display_name) ||
    toStringOrNull(doc?.name) ||
    toStringOrNull(profile?.username) ||
    toStringOrNull(profile?.real_name) ||
    null;

  const email =
    toStringOrNull(doc?.email) ||
    toStringOrNull(profile?.email) ||
    null;

  const phone =
    toStringOrNull(doc?.phone) ||
    toStringOrNull(profile?.phone) ||
    null;

  const birthDate =
    toIsoOrNull(doc?.birth_date) ||
    toIsoOrNull(doc?.birthDate) ||
    toIsoOrNull(profile?.birth_date) ||
    toIsoOrNull(profile?.birthDate) ||
    null;

  const gender =
    toStringOrNull(doc?.gender) ||
    toStringOrNull(profile?.gender) ||
    null;

  const cityName =
    toStringOrNull(doc?.city_name) ||
    toStringOrNull(profile?.city_name) ||
    toStringOrNull(profile?.city) ||
    toStringOrNull(doc?.location?.city) ||
    toStringOrNull(profile?.location?.city) ||
    null;

  const educationLevel =
    toStringOrNull(doc?.education_level) ||
    toStringOrNull(profile?.education_level) ||
    toStringOrNull(doc?.education) ||
    toStringOrNull(profile?.education) ||
    null;

  const occupation =
    toStringOrNull(doc?.occupation) ||
    toStringOrNull(profile?.occupation) ||
    null;

  const mbti =
    toStringOrNull(doc?.mbti) ||
    toStringOrNull(profile?.mbti) ||
    null;

  const accountStatus =
    toStringOrNull(doc?.account_status) ||
    (doc?.is_active === true ? "active" : doc?.is_active === false ? "inactive" : null);

  const verificationLevel =
    toNumberOrNull(doc?.verification_level) ||
    toNumberOrNull(profile?.verification_level) ||
    null;

  const lastActiveAt =
    toIsoOrNull(doc?.last_active_at) ||
    toIsoOrNull(doc?.lastActiveAt) ||
    toIsoOrNull(profile?.last_active_at) ||
    toIsoOrNull(profile?.lastActiveAt) ||
    null;

  const createdAt =
    toIsoOrNull(doc?.created_at) ||
    toIsoOrNull(doc?.createdAt) ||
    toIsoOrNull(doc?.created_time) ||
    null;

  const updatedAt =
    toIsoOrNull(doc?.updated_at) ||
    toIsoOrNull(doc?.updatedAt) ||
    null;

  const { loginMethods, isWechatLogin } = buildLoginFlags({
    email,
    authProviders: [
      ...toStringArray(doc?.auth_providers),
      ...toStringArray(profile?.auth_providers),
    ],
    wechatOpenid:
      toStringOrNull(doc?.wechat_openid) || toStringOrNull(profile?.wechat_openid),
    wechatUnionid:
      toStringOrNull(doc?.wechat_unionid) || toStringOrNull(profile?.wechat_unionid),
  });

  return {
    id,
    region: "CN",
    username,
    email,
    phone,
    gender,
    birth_date: birthDate,
    age: calcAge(birthDate),
    city_name: cityName,
    education_level: educationLevel,
    occupation,
    mbti,
    account_status: accountStatus,
    verification_level: verificationLevel,
    last_active_at: lastActiveAt,
    created_at: createdAt,
    updated_at: updatedAt,
    login_methods: loginMethods,
    is_wechat_login: isWechatLogin,
    raw: doc,
  };
}

function normalizeIntlUser(row: any): NormalizedUser {
  const birthDate = toIsoOrNull(row?.birth_date);
  const email = toStringOrNull(row?.email);
  const { loginMethods, isWechatLogin } = buildLoginFlags({
    email,
    authProviders: toStringArray(row?.auth_providers),
    wechatOpenid: toStringOrNull(row?.wechat_openid),
    wechatUnionid: toStringOrNull(row?.wechat_unionid),
  });

  return {
    id: toStringOrNull(row?.id) || "",
    region: "INTL",
    username: toStringOrNull(row?.username) || toStringOrNull(row?.real_name) || null,
    email,
    phone: toStringOrNull(row?.phone),
    gender: toStringOrNull(row?.gender),
    birth_date: birthDate,
    age: toNumberOrNull(row?.age) ?? calcAge(birthDate),
    city_name: toStringOrNull(row?.city_name),
    education_level: toStringOrNull(row?.education_level),
    occupation: toStringOrNull(row?.occupation),
    mbti: toStringOrNull(row?.mbti),
    account_status: toStringOrNull(row?.account_status),
    verification_level: toNumberOrNull(row?.verification_level),
    last_active_at: toIsoOrNull(row?.last_active_at),
    created_at: toIsoOrNull(row?.created_at),
    updated_at: toIsoOrNull(row?.updated_at),
    login_methods: loginMethods,
    is_wechat_login: isWechatLogin,
    raw: row,
  };
}

async function proxyFetchSideUsers(
  request: NextRequest,
  targetOrigin: string,
  source: "CN" | "INTL",
  page: number,
  pageSize: number,
  q: string | null,
  sort: CreatedSort
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

  const targetUrl = new URL("/api/admin/users", targetOrigin);
  targetUrl.searchParams.set("source", source);
  targetUrl.searchParams.set("page", String(page));
  targetUrl.searchParams.set("pageSize", String(pageSize));
  if (q) targetUrl.searchParams.set("q", q);
  targetUrl.searchParams.set("sort", sort);

  const headers = new Headers();
  headers.set("x-admin-proxy-hop", "1");
  headers.set("x-admin-proxy-secret", proxySecret);

  const adminSession = request.cookies.get("admin_session")?.value;
  if (adminSession) {
    headers.set("cookie", `admin_session=${adminSession}`);
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

async function fetchCnUsers(
  skip: number,
  take: number,
  q: string | null,
  sort: CreatedSort
) {
  if (!hasCnDbConfig()) {
    return {
      ok: false as const,
      missing: getCnConfigMissing(),
      total: 0,
      users: [] as NormalizedUser[],
    };
  }

  const app = cloudbase.init({
    env: process.env.CLOUDBASE_ENV_ID,
    secretId: process.env.CLOUDBASE_SECRET_ID,
    secretKey: process.env.CLOUDBASE_SECRET_KEY,
  });
  const db = app.database();
  const _ = db.command;

  const where: any = {};
  const query = (q || "").trim();
  if (query) {
    const orConditions: any[] = [
      { _id: query },
      { id: query },
      { user_id: query },
      { username: query },
      { display_name: query },
      { email: query.toLowerCase() },
      { phone: query },
    ];
    where["$or"] = orConditions;
  }

  const usersCollection = db.collection("users");

  const countQuery =
    Object.keys(where).length > 0 ? usersCollection.where(where) : usersCollection;
  const countResult = await countQuery.count().catch(() => ({ total: 0 }));
  const total = countResult?.total || 0;
  const start = Math.max(0, skip);
  if (start >= total) return { ok: true as const, total, users: [] as NormalizedUser[] };

  const target = Math.min(take, total - start);

  const orderDirection = sort === "created_asc" ? "asc" : "desc";

  const buildQuery = (orderField: "createdAt" | "created_at", skip: number, take: number) => {
    const q = Object.keys(where).length > 0 ? usersCollection.where(where) : usersCollection;
    return q.orderBy(orderField, orderDirection).skip(skip).limit(take).get();
  };

  let orderField: "createdAt" | "created_at" = "createdAt";
  try {
    const probe = await buildQuery("createdAt", 0, 1);
    if ((!probe?.data || probe.data.length === 0) && total > 0) orderField = "created_at";
  } catch {
    orderField = "created_at";
  }

  const chunkSize = 100;
  const collectedDocs: any[] = [];
  for (let offset = start; offset < start + target; offset += chunkSize) {
    const chunkTake = Math.min(chunkSize, start + target - offset);
    try {
      const res = await buildQuery(orderField, offset, chunkTake);
      const data = Array.isArray(res?.data) ? res.data : [];
      if (data.length === 0) break;
      collectedDocs.push(...data);
    } catch (e: any) {
      return {
        ok: false as const,
        error: e?.message || "获取 CN 用户列表失败",
        total,
        users: [] as NormalizedUser[],
      };
    }
  }

  const userDocs: any[] = collectedDocs;

  const uniq = (values: Array<string | null | undefined>) =>
    Array.from(new Set(values.map((v) => (v || "").trim()).filter(Boolean)));

  const userIds = uniq(
    userDocs.flatMap((doc: any) => [
      toStringOrNull(doc?.id),
      toStringOrNull(doc?._id),
      toStringOrNull(doc?.user_id),
      toStringOrNull(doc?.userId),
    ])
  );

  const profileByKey = new Map<string, any>();
  const addProfile = (p: any) => {
    if (!p) return;
    const keys = [
      toStringOrNull(p?.user_id),
      toStringOrNull(p?.userId),
      toStringOrNull(p?.id),
      toStringOrNull(p?._id),
    ].filter(Boolean) as string[];
    for (const k of keys) profileByKey.set(k, p);
  };

  if (userIds.length > 0) {
    try {
      const profilesCollection = db.collection("user_profiles");
      const chunkSize = 50;
      for (let i = 0; i < userIds.length; i += chunkSize) {
        const chunk = userIds.slice(i, i + chunkSize);
        if (chunk.length === 0) continue;
        const whereProfile: any = {
          $or: [
            { user_id: _.in(chunk) },
            { userId: _.in(chunk) },
            { id: _.in(chunk) },
            { _id: _.in(chunk) },
          ],
        };
        const res = await profilesCollection.where(whereProfile).get();
        const list = Array.isArray(res?.data) ? res.data : [];
        for (const p of list) addProfile(p);
      }
    } catch {
    }
  }

  const list = userDocs.map((doc: any) => {
    const keys = [
      toStringOrNull(doc?.id),
      toStringOrNull(doc?._id),
      toStringOrNull(doc?.user_id),
      toStringOrNull(doc?.userId),
    ].filter(Boolean) as string[];
    const profile =
      keys.map((k) => profileByKey.get(k)).find(Boolean) || null;
    const merged = { ...doc, user_profile: profile };
    return normalizeCnUser(merged);
  });
  return { ok: true as const, total, users: list };
}

async function fetchIntlUsers(
  skip: number,
  take: number,
  q: string | null,
  sort: CreatedSort
) {
  if (!supabaseAdmin) {
    return {
      ok: false as const,
      missing: getIntlConfigMissing(),
      total: 0,
      users: [] as NormalizedUser[],
    };
  }

  const query = (q || "").trim();
  const maybeUuid = query && isUuid(query) ? query : null;
  const ilike = query ? `%${query}%` : null;

  let countQuery = supabaseAdmin
    .from("v_user_full_profile")
    .select("id", { count: "exact", head: true });

  if (query) {
    const orParts: string[] = [];
    if (maybeUuid) orParts.push(`id.eq.${maybeUuid}`);
    orParts.push(`username.ilike.${ilike}`);
    orParts.push(`email.ilike.${ilike}`);
    orParts.push(`phone.ilike.${ilike}`);
    orParts.push(`real_name.ilike.${ilike}`);
    countQuery = countQuery.or(orParts.join(","));
  }

  const { count, error: countError } = await countQuery;
  if (countError) {
    return {
      ok: false as const,
      error: countError.message || "获取 INTL 用户总数失败",
      total: 0,
      users: [] as NormalizedUser[],
    };
  }

  const total = count || 0;
  const start = Math.max(0, skip);
  if (start >= total) return { ok: true as const, total, users: [] as NormalizedUser[] };

  const target = Math.min(take, total - start);
  const chunkSize = 200;
  const collected: any[] = [];

  for (let offset = start; offset < start + target; offset += chunkSize) {
    const chunkTo = Math.min(start + target - 1, offset + chunkSize - 1);
    let listQuery = supabaseAdmin
      .from("v_user_full_profile")
      .select("*")
      .order("created_at", { ascending: sort === "created_asc" })
      .range(offset, chunkTo);

    if (query) {
      const orParts: string[] = [];
      if (maybeUuid) orParts.push(`id.eq.${maybeUuid}`);
      orParts.push(`username.ilike.${ilike}`);
      orParts.push(`email.ilike.${ilike}`);
      orParts.push(`phone.ilike.${ilike}`);
      orParts.push(`real_name.ilike.${ilike}`);
      listQuery = listQuery.or(orParts.join(","));
    }

    const { data, error } = await listQuery;
    if (error) {
      return {
        ok: false as const,
        error: error.message || "获取 INTL 用户列表失败",
        total,
        users: [] as NormalizedUser[],
      };
    }
    if (!data || data.length === 0) break;
    collected.push(...data);
  }

  return {
    ok: true as const,
    total,
    users: collected.map((row: any) => normalizeIntlUser(row)),
  };
}

async function proxyFetchUsersFirstN(
  request: NextRequest,
  targetOrigin: string,
  source: "CN" | "INTL",
  take: number,
  q: string | null,
  sort: CreatedSort
) {
  const pageSize = 100;
  const collected: any[] = [];
  let total = 0;
  let page = 1;

  while (collected.length < take) {
    const remote = await proxyFetchSideUsers(
      request,
      targetOrigin,
      source,
      page,
      pageSize,
      q,
      sort
    );

    if (page === 1) total = Number(remote?.total) || 0;
    const users = Array.isArray(remote?.users) ? remote.users : [];
    collected.push(...users);

    if (users.length < pageSize) break;
    if (total > 0 && collected.length >= total) break;

    page += 1;
    if (page > 1000) break;
  }

  return { ok: true as const, total, users: collected.slice(0, take) as NormalizedUser[] };
}

function ts(value: any): number {
  const t = new Date(value || 0).getTime();
  return Number.isFinite(t) ? t : 0;
}

function dedupeUsers(users: NormalizedUser[]): NormalizedUser[] {
  const seen = new Set<string>();
  const deduped: NormalizedUser[] = [];
  for (const u of users) {
    const id = (u?.id || "").trim();
    if (!id) continue;
    const key = `${u.region}:${id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(u);
  }
  return deduped;
}

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const source = parseUsersSource(url.searchParams.get("source"));
    const sort = parseCreatedSort(url.searchParams.get("sort"));
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") || "20")));
    const q = (url.searchParams.get("q") || "").trim() || null;

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const canProxy = !isInternalProxyRequest(request);

    if (source === "CN") {
      if (hasCnDbConfig()) {
        const result = await fetchCnUsers(from, pageSize, q, sort);
        if (!result.ok) {
          if ((result as any).missing) {
            return NextResponse.json(
              { error: "CN 数据源未配置", missing: (result as any).missing },
              { status: 503 }
            );
          }
          return NextResponse.json({ error: "获取用户列表失败" }, { status: 500 });
        }
        return NextResponse.json(
          {
            region: "cn",
            users: dedupeUsers(result.users),
            total: result.total,
            page,
            pageSize,
            sort,
          },
          { headers: { "cache-control": "no-store" } }
        );
      }

      if (canProxy) {
        const remote = await proxyFetchSideUsers(
          request,
          CN_APP_ORIGIN,
          "CN",
          page,
          pageSize,
          q,
          sort
        );
        return NextResponse.json(remote, { headers: { "cache-control": "no-store" } });
      }

      return NextResponse.json(
        { error: "CN 数据源未配置", missing: getCnConfigMissing() },
        { status: 503 }
      );
    }

    if (source === "INTL") {
      if (hasIntlDbConfig()) {
        const result = await fetchIntlUsers(from, pageSize, q, sort);
        if (!result.ok) {
          if ((result as any).missing) {
            return NextResponse.json(
              { error: "INTL 数据源未配置", missing: (result as any).missing },
              { status: 503 }
            );
          }
          return NextResponse.json({ error: "获取用户列表失败" }, { status: 500 });
        }
        return NextResponse.json(
          {
            region: "intl",
            users: dedupeUsers(result.users),
            total: result.total,
            page,
            pageSize,
            sort,
          },
          { headers: { "cache-control": "no-store" } }
        );
      }

      if (canProxy) {
        const remote = await proxyFetchSideUsers(
          request,
          INTL_APP_ORIGIN,
          "INTL",
          page,
          pageSize,
          q,
          sort
        );
        return NextResponse.json(remote, { headers: { "cache-control": "no-store" } });
      }

      return NextResponse.json(
        { error: "INTL 数据源未配置", missing: getIntlConfigMissing() },
        { status: 503 }
      );
    }

    const desired = to + 1;

    const [cnSide, intlSide] = await Promise.all([
      (async () => {
        if (hasCnDbConfig()) return fetchCnUsers(0, desired, q, sort);
        if (!canProxy) {
          return {
            ok: false as const,
            missing: getCnConfigMissing(),
            total: 0,
            users: [] as NormalizedUser[],
          };
        }
        try {
          return await proxyFetchUsersFirstN(
            request,
            CN_APP_ORIGIN,
            "CN",
            desired,
            q,
            sort
          );
        } catch (e: any) {
          return {
            ok: false as const,
            error: e?.message || "CN 代理失败",
            total: 0,
            users: [] as NormalizedUser[],
          };
        }
      })(),
      (async () => {
        if (hasIntlDbConfig()) return fetchIntlUsers(0, desired, q, sort);
        if (!canProxy) {
          return {
            ok: false as const,
            missing: getIntlConfigMissing(),
            total: 0,
            users: [] as NormalizedUser[],
          };
        }
        try {
          return await proxyFetchUsersFirstN(
            request,
            INTL_APP_ORIGIN,
            "INTL",
            desired,
            q,
            sort
          );
        } catch (e: any) {
          return {
            ok: false as const,
            error: e?.message || "INTL 代理失败",
            total: 0,
            users: [] as NormalizedUser[],
          };
        }
      })(),
    ]);

    const sources = {
      cn: cnSide.ok
        ? { ok: true as const, total: cnSide.total }
        : {
            ok: false as const,
            total: (cnSide as any).total || 0,
            missing: (cnSide as any).missing,
            error: (cnSide as any).error,
          },
      intl: intlSide.ok
        ? { ok: true as const, total: intlSide.total }
        : {
            ok: false as const,
            total: (intlSide as any).total || 0,
            missing: (intlSide as any).missing,
            error: (intlSide as any).error,
          },
    };

    const merged = [...(cnSide.users || []), ...(intlSide.users || [])]
      .sort((a, b) =>
        sort === "created_asc"
          ? ts(a.created_at) - ts(b.created_at)
          : ts(b.created_at) - ts(a.created_at)
      );
    const deduped = dedupeUsers(merged);
    const users = deduped.slice(from, from + pageSize);
    const total = (cnSide.total || 0) + (intlSide.total || 0);

    return NextResponse.json(
      {
        region: "all",
        users,
        total,
        page,
        pageSize,
        sort,
        sources,
      },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (error) {
    console.error("获取用户列表失败:", error);
    return NextResponse.json({ error: "获取用户列表失败" }, { status: 500 });
  }
}
