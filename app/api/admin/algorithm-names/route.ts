import { NextRequest, NextResponse } from "next/server";
import cloudbase from "@cloudbase/node-sdk";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyAdminSessionToken } from "@/utils/session";
import { getTranslations } from "@/lib/i18n";
import type { AlgoTypeEnum } from "@/types/database";

export const dynamic = "force-dynamic";

const CN_APP_ORIGIN =
  process.env.CN_APP_ORIGIN || "https://personalink.mornscience.top";
const INTL_APP_ORIGIN =
  process.env.INTL_APP_ORIGIN || "https://www.mornhub.lat";

type Source = "ALL" | "CN" | "INTL";
type Language = "zh" | "en";
type AlgorithmType = AlgoTypeEnum;

const ALGORITHMS: AlgorithmType[] = [
  "compatible",
  "romantic",
  "pragmatic",
  "serendipity",
];
const LANGUAGES: Language[] = ["zh", "en"];

function parseSource(value: string | null): Source {
  const normalized = (value || "").toUpperCase();
  if (normalized === "CN" || normalized === "INTL") return normalized;
  return "ALL";
}

function hasCnDbConfig(): boolean {
  return !!(
    (process.env.CLOUDBASE_ENV_ID || process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID) &&
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

function getDefaultName(algorithmType: AlgorithmType, language: Language): string {
  const t = getTranslations(language) as any;
  const name = t?.matching?.algorithms?.[algorithmType]?.name;
  if (typeof name === "string" && name.trim()) return name.trim();
  return algorithmType;
}

function buildEffective(
  overrides: Partial<Record<AlgorithmType, Partial<Record<Language, string>>>>
): Record<AlgorithmType, Record<Language, string>> {
  const out = {} as Record<AlgorithmType, Record<Language, string>>;
  for (const algo of ALGORITHMS) {
    out[algo] = {
      zh: (overrides[algo]?.zh || getDefaultName(algo, "zh")).trim(),
      en: (overrides[algo]?.en || getDefaultName(algo, "en")).trim(),
    };
  }
  return out;
}

async function readCnOverrides(): Promise<
  Partial<Record<AlgorithmType, Partial<Record<Language, string>>>>
> {
  const app = cloudbase.init({
    env: process.env.CLOUDBASE_ENV_ID || process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID,
    secretId: process.env.CLOUDBASE_SECRET_ID,
    secretKey: process.env.CLOUDBASE_SECRET_KEY,
  });
  const db = app.database();
  const _ = db.command;

  const res = await db
    .collection("algorithm_name_overrides")
    .where({
      algorithmType: _.in(ALGORITHMS),
      language: _.in(LANGUAGES),
    })
    .field({ algorithmType: true, language: true, displayName: true })
    .get()
    .catch(() => ({ data: [] as any[] }));

  const out: Partial<Record<AlgorithmType, Partial<Record<Language, string>>>> = {};
  for (const item of res.data || []) {
    const algorithmType = item?.algorithmType as AlgorithmType;
    const language = item?.language as Language;
    const displayName = typeof item?.displayName === "string" ? item.displayName : "";
    if (!ALGORITHMS.includes(algorithmType) || !LANGUAGES.includes(language)) continue;
    out[algorithmType] = out[algorithmType] || {};
    if (displayName.trim()) out[algorithmType]![language] = displayName.trim();
  }
  return out;
}

async function readIntlOverrides(): Promise<
  Partial<Record<AlgorithmType, Partial<Record<Language, string>>>>
> {
  if (!supabaseAdmin) return {};
  const { data } = await supabaseAdmin
    .from("algorithm_name_overrides")
    .select("algorithm_type, language, display_name")
    .in("algorithm_type", ALGORITHMS)
    .in("language", LANGUAGES);

  const out: Partial<Record<AlgorithmType, Partial<Record<Language, string>>>> = {};
  for (const item of data || []) {
    const algorithmType = item?.algorithm_type as AlgorithmType;
    const language = item?.language as Language;
    const displayName = typeof item?.display_name === "string" ? item.display_name : "";
    if (!ALGORITHMS.includes(algorithmType) || !LANGUAGES.includes(language)) continue;
    out[algorithmType] = out[algorithmType] || {};
    if (displayName.trim()) out[algorithmType]![language] = displayName.trim();
  }
  return out;
}

async function upsertCnName(
  algorithmType: AlgorithmType,
  language: Language,
  displayName: string,
  updatedBy: string | null
) {
  const app = cloudbase.init({
    env: process.env.CLOUDBASE_ENV_ID || process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID,
    secretId: process.env.CLOUDBASE_SECRET_ID,
    secretKey: process.env.CLOUDBASE_SECRET_KEY,
  });
  const db = app.database();
  const existing = await db
    .collection("algorithm_name_overrides")
    .where({ algorithmType, language })
    .limit(1)
    .get()
    .catch(() => ({ data: [] as any[] }));

  const updatePayload: any = {
    displayName,
    updatedAt: Date.now(),
  };
  if (updatedBy) updatePayload.updatedBy = updatedBy;

  if (existing.data && existing.data.length > 0) {
    const docId = existing.data[0]._id;
    await db.collection("algorithm_name_overrides").doc(docId).update(updatePayload);
    return;
  }

  await db.collection("algorithm_name_overrides").add({
    algorithmType,
    language,
    displayName,
    updatedAt: Date.now(),
    ...(updatedBy ? { updatedBy } : {}),
  });
}

async function upsertIntlName(
  algorithmType: AlgorithmType,
  language: Language,
  displayName: string,
  updatedBy: string | null
) {
  if (!supabaseAdmin) throw new Error("Supabase not configured");
  const payload: any = {
    algorithm_type: algorithmType,
    language,
    display_name: displayName,
    updated_at: new Date().toISOString(),
  };
  if (updatedBy) payload.updated_by = updatedBy;

  const { error } = await supabaseAdmin
    .from("algorithm_name_overrides")
    .upsert(payload, { onConflict: "algorithm_type,language" });
  if (error) throw error;
}

async function proxyFetch(
  request: NextRequest,
  targetOrigin: string,
  source: Exclude<Source, "ALL">,
  method: "GET" | "POST",
  body?: unknown
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

  const targetUrl = new URL("/api/admin/algorithm-names", targetOrigin);
  targetUrl.searchParams.set("source", source);

  const headers = new Headers();
  headers.set("x-admin-proxy-hop", "1");
  headers.set("x-admin-proxy-secret", proxySecret);
  if (method === "POST") headers.set("content-type", "application/json");

  const adminSession = request.cookies.get("admin_session")?.value;
  if (adminSession) headers.set("cookie", `admin_session=${adminSession}`);

  const res = await fetch(targetUrl.toString(), {
    method,
    headers,
    body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
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
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const source = parseSource(url.searchParams.get("source"));
    const canProxy = !isInternalProxyRequest(request);

    let cn: Record<AlgorithmType, Record<Language, string>> | undefined;
    let intl: Record<AlgorithmType, Record<Language, string>> | undefined;

    if (source === "CN" || source === "ALL") {
      if (hasCnDbConfig()) {
        cn = buildEffective(await readCnOverrides());
      } else if (canProxy) {
        try {
          const remote = await proxyFetch(request, CN_APP_ORIGIN, "CN", "GET");
          cn = (remote as any)?.cn;
        } catch {
          cn = undefined;
        }
      }
    }

    if (source === "INTL" || source === "ALL") {
      if (hasIntlDbConfig()) {
        intl = buildEffective(await readIntlOverrides());
      } else if (canProxy) {
        try {
          const remote = await proxyFetch(request, INTL_APP_ORIGIN, "INTL", "GET");
          intl = (remote as any)?.intl;
        } catch {
          intl = undefined;
        }
      }
    }

    return NextResponse.json({ cn, intl });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = (await request.json().catch(() => null)) as any;
    const source = String(payload?.source || "").toUpperCase() as Source;
    const algorithmType = payload?.algorithmType as AlgorithmType;
    const updates = payload?.updates as Partial<Record<Language, string>>;

    if (source !== "CN" && source !== "INTL") {
      return NextResponse.json({ error: "Invalid source" }, { status: 400 });
    }
    if (!ALGORITHMS.includes(algorithmType)) {
      return NextResponse.json({ error: "Invalid algorithmType" }, { status: 400 });
    }
    const zh = typeof updates?.zh === "string" ? updates.zh.trim() : "";
    const en = typeof updates?.en === "string" ? updates.en.trim() : "";
    if (!zh || !en) {
      return NextResponse.json({ error: "Invalid updates" }, { status: 400 });
    }

    const canProxy = !isInternalProxyRequest(request);
    const updatedBy = isInternalProxyRequest(request)
      ? null
      : (request.cookies.get("admin_session")?.value ? "admin" : null);

    if (source === "CN") {
      if (hasCnDbConfig()) {
        await upsertCnName(algorithmType, "zh", zh, updatedBy);
        await upsertCnName(algorithmType, "en", en, updatedBy);
      } else if (canProxy) {
        await proxyFetch(request, CN_APP_ORIGIN, "CN", "POST", payload);
      } else {
        return NextResponse.json({ error: "CN DB not configured" }, { status: 501 });
      }
    }

    if (source === "INTL") {
      if (hasIntlDbConfig()) {
        await upsertIntlName(algorithmType, "zh", zh, updatedBy);
        await upsertIntlName(algorithmType, "en", en, updatedBy);
      } else if (canProxy) {
        await proxyFetch(request, INTL_APP_ORIGIN, "INTL", "POST", payload);
      } else {
        return NextResponse.json({ error: "INTL DB not configured" }, { status: 501 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

