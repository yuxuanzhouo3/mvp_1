import { NextRequest, NextResponse } from "next/server";
import cloudbase from "@cloudbase/node-sdk";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyAdminSessionToken } from "@/utils/session";
import type { AlgoTypeEnum, GenderEnum } from "@/types/database";
import {
  ALGORITHM_WEIGHTS,
  type AlgorithmWeightsMap,
  type FactorWeights,
} from "@/lib/matching/types";

export const dynamic = "force-dynamic";

const CN_APP_ORIGIN =
  process.env.CN_APP_ORIGIN || "https://personalink.mornscience.top";
const INTL_APP_ORIGIN =
  process.env.INTL_APP_ORIGIN || "https://www.mornhub.lat";

type Source = "ALL" | "CN" | "INTL";
type AlgorithmType = AlgoTypeEnum;
type GenderKey = "maleEvaluatingFemale" | "femaleEvaluatingMale";

const ALGORITHMS: AlgorithmType[] = [
  "compatible",
  "romantic",
  "pragmatic",
  "serendipity",
];

const FACTOR_KEYS: Array<keyof FactorWeights> = [
  "wealth",
  "education",
  "age",
  "bmi",
  "appearance",
  "relationshipHistory",
  "personality",
  "jobStability",
  "location",
  "childrenPreference",
];

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

function normalizeWeights(input: unknown): FactorWeights | null {
  if (!input || typeof input !== "object") return null;
  const result: FactorWeights = {
    wealth: 0,
    education: 0,
    age: 0,
    bmi: 0,
    appearance: 0,
    relationshipHistory: 0,
    personality: 0,
    jobStability: 0,
    location: 0,
    childrenPreference: 0,
  };
  for (const key of FACTOR_KEYS) {
    const value = Number((input as any)[key]);
    if (!Number.isFinite(value) || value < 0) return null;
    result[key] = value;
  }
  return result;
}

function isValidWeights(weights: FactorWeights): boolean {
  const sum = FACTOR_KEYS.reduce((total, key) => total + (weights[key] || 0), 0);
  return Math.abs(sum - 1) <= 0.01;
}

function buildEffective(overrides: Partial<AlgorithmWeightsMap>): AlgorithmWeightsMap {
  const base = JSON.parse(JSON.stringify(ALGORITHM_WEIGHTS)) as AlgorithmWeightsMap;
  for (const algorithm of ALGORITHMS) {
    const override = overrides[algorithm];
    if (!override) continue;
    if (override.maleEvaluatingFemale && isValidWeights(override.maleEvaluatingFemale)) {
      base[algorithm].maleEvaluatingFemale = override.maleEvaluatingFemale;
    }
    if (override.femaleEvaluatingMale && isValidWeights(override.femaleEvaluatingMale)) {
      base[algorithm].femaleEvaluatingMale = override.femaleEvaluatingMale;
    }
  }
  return base;
}

async function readCnOverrides(): Promise<Partial<AlgorithmWeightsMap>> {
  const app = cloudbase.init({
    env: process.env.CLOUDBASE_ENV_ID || process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID,
    secretId: process.env.CLOUDBASE_SECRET_ID,
    secretKey: process.env.CLOUDBASE_SECRET_KEY,
  });
  const db = app.database();
  const _ = db.command;

  const res = await db
    .collection("algorithm_weight_configs")
    .where({
      algorithm_type: _.in(ALGORITHMS),
      evaluator_gender: _.in(["male", "female"]),
      target_gender: _.in(["male", "female"]),
    })
    .field({
      algorithm_type: true,
      evaluator_gender: true,
      target_gender: true,
      weights: true,
    })
    .get()
    .catch(() => ({ data: [] as any[] }));

  const out: Partial<AlgorithmWeightsMap> = {};
  for (const item of res.data || []) {
    const algorithmType = item?.algorithm_type as AlgorithmType;
    const evaluatorGender = item?.evaluator_gender as GenderEnum;
    const targetGender = item?.target_gender as GenderEnum;
    const weights = normalizeWeights(item?.weights);
    if (!ALGORITHMS.includes(algorithmType) || !weights) continue;

    const genderKey: GenderKey | null =
      evaluatorGender === "male" && targetGender === "female"
        ? "maleEvaluatingFemale"
        : evaluatorGender === "female" && targetGender === "male"
        ? "femaleEvaluatingMale"
        : null;
    if (!genderKey) continue;

    out[algorithmType] = out[algorithmType] || ({} as AlgorithmWeightsMap[AlgorithmType]);
    out[algorithmType]![genderKey] = weights;
  }
  return out;
}

async function readIntlOverrides(): Promise<Partial<AlgorithmWeightsMap>> {
  if (!supabaseAdmin) return {};
  const { data } = await supabaseAdmin
    .from("algorithm_weight_configs")
    .select("algorithm_type, evaluator_gender, target_gender, weights")
    .in("algorithm_type", ALGORITHMS)
    .in("evaluator_gender", ["male", "female"])
    .in("target_gender", ["male", "female"]);

  const out: Partial<AlgorithmWeightsMap> = {};
  for (const item of data || []) {
    const algorithmType = item?.algorithm_type as AlgorithmType;
    const evaluatorGender = item?.evaluator_gender as GenderEnum;
    const targetGender = item?.target_gender as GenderEnum;
    const weights = normalizeWeights(item?.weights);
    if (!ALGORITHMS.includes(algorithmType) || !weights) continue;

    const genderKey: GenderKey | null =
      evaluatorGender === "male" && targetGender === "female"
        ? "maleEvaluatingFemale"
        : evaluatorGender === "female" && targetGender === "male"
        ? "femaleEvaluatingMale"
        : null;
    if (!genderKey) continue;

    out[algorithmType] = out[algorithmType] || ({} as AlgorithmWeightsMap[AlgorithmType]);
    out[algorithmType]![genderKey] = weights;
  }
  return out;
}

async function upsertCnWeights(
  algorithmType: AlgorithmType,
  evaluatorGender: GenderEnum,
  targetGender: GenderEnum,
  weights: FactorWeights,
  updatedBy: string | null
) {
  const app = cloudbase.init({
    env: process.env.CLOUDBASE_ENV_ID || process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID,
    secretId: process.env.CLOUDBASE_SECRET_ID,
    secretKey: process.env.CLOUDBASE_SECRET_KEY,
  });
  const db = app.database();
  const existing = await db
    .collection("algorithm_weight_configs")
    .where({ algorithm_type: algorithmType, evaluator_gender: evaluatorGender, target_gender: targetGender })
    .limit(1)
    .get()
    .catch(() => ({ data: [] as any[] }));

  const payload: any = {
    algorithm_type: algorithmType,
    evaluator_gender: evaluatorGender,
    target_gender: targetGender,
    weights,
    updated_at: new Date().toISOString(),
  };
  if (updatedBy) payload.updated_by = updatedBy;

  if (existing.data && existing.data.length > 0) {
    await db.collection("algorithm_weight_configs").doc(existing.data[0]._id).update(payload);
    return;
  }

  await db.collection("algorithm_weight_configs").add(payload);
}

async function upsertIntlWeights(
  algorithmType: AlgorithmType,
  evaluatorGender: GenderEnum,
  targetGender: GenderEnum,
  weights: FactorWeights,
  updatedBy: string | null
) {
  if (!supabaseAdmin) throw new Error("Supabase not configured");
  const payload: any = {
    algorithm_type: algorithmType,
    evaluator_gender: evaluatorGender,
    target_gender: targetGender,
    weights,
    updated_at: new Date().toISOString(),
  };
  if (updatedBy) payload.updated_by = updatedBy;

  const { error } = await supabaseAdmin
    .from("algorithm_weight_configs")
    .upsert(payload, { onConflict: "algorithm_type,evaluator_gender,target_gender" });
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

  const targetUrl = new URL("/api/admin/algorithm-weights", targetOrigin);
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

    let cn: AlgorithmWeightsMap | undefined;
    let intl: AlgorithmWeightsMap | undefined;

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
    const updates = payload?.updates as Partial<Record<GenderKey, FactorWeights>>;

    if (source !== "CN" && source !== "INTL") {
      return NextResponse.json({ error: "Invalid source" }, { status: 400 });
    }
    if (!ALGORITHMS.includes(algorithmType)) {
      return NextResponse.json({ error: "Invalid algorithmType" }, { status: 400 });
    }

    const maleWeights = normalizeWeights(updates?.maleEvaluatingFemale);
    const femaleWeights = normalizeWeights(updates?.femaleEvaluatingMale);

    if (!maleWeights || !femaleWeights) {
      return NextResponse.json({ error: "Invalid updates" }, { status: 400 });
    }
    if (!isValidWeights(maleWeights) || !isValidWeights(femaleWeights)) {
      return NextResponse.json({ error: "Invalid weights" }, { status: 400 });
    }

    const canProxy = !isInternalProxyRequest(request);
    const updatedBy = isInternalProxyRequest(request)
      ? null
      : (request.cookies.get("admin_session")?.value ? "admin" : null);

    if (source === "CN") {
      if (hasCnDbConfig()) {
        await upsertCnWeights(algorithmType, "male", "female", maleWeights, updatedBy);
        await upsertCnWeights(algorithmType, "female", "male", femaleWeights, updatedBy);
      } else if (canProxy) {
        await proxyFetch(request, CN_APP_ORIGIN, "CN", "POST", payload);
      } else {
        return NextResponse.json({ error: "CN DB not configured" }, { status: 501 });
      }
    }

    if (source === "INTL") {
      if (hasIntlDbConfig()) {
        await upsertIntlWeights(algorithmType, "male", "female", maleWeights, updatedBy);
        await upsertIntlWeights(algorithmType, "female", "male", femaleWeights, updatedBy);
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
