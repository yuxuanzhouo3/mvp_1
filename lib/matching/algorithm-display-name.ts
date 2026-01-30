import cloudbase from "@cloudbase/node-sdk";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getTranslations } from "@/lib/i18n";
import { isChinaRequest } from "@/lib/config/request-region";
import type { AlgoTypeEnum } from "@/types/database";

export type AlgorithmType = AlgoTypeEnum;
export type Language = "zh" | "en";

const ALGORITHMS: AlgorithmType[] = [
  "compatible",
  "romantic",
  "pragmatic",
  "serendipity",
];

function hasCnDbConfig(): boolean {
  return !!(
    (process.env.CLOUDBASE_ENV_ID || process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID) &&
    process.env.CLOUDBASE_SECRET_ID &&
    process.env.CLOUDBASE_SECRET_KEY
  );
}

function parseLanguage(raw: string | null, fallback: Language): Language {
  const value = (raw || "").toLowerCase();
  if (value === "zh" || value.startsWith("zh-")) return "zh";
  if (value === "en" || value.startsWith("en-")) return "en";
  return fallback;
}

function getDefaultName(algorithmType: AlgorithmType, language: Language): string {
  const t = getTranslations(language) as any;
  const name = t?.matching?.algorithms?.[algorithmType]?.name;
  if (typeof name === "string" && name.trim()) return name.trim();
  return algorithmType;
}

async function readCnOverrides(language: Language): Promise<Partial<Record<AlgorithmType, string>>> {
  if (!hasCnDbConfig()) return {};
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
      language,
    })
    .field({ algorithmType: true, displayName: true })
    .get()
    .catch(() => ({ data: [] as any[] }));

  const out: Partial<Record<AlgorithmType, string>> = {};
  for (const item of res.data || []) {
    const algorithmType = item?.algorithmType as AlgorithmType;
    const displayName = typeof item?.displayName === "string" ? item.displayName : "";
    if (!ALGORITHMS.includes(algorithmType)) continue;
    if (displayName.trim()) out[algorithmType] = displayName.trim();
  }
  return out;
}

async function readIntlOverrides(language: Language): Promise<Partial<Record<AlgorithmType, string>>> {
  if (!supabaseAdmin) return {};
  const { data } = await supabaseAdmin
    .from("algorithm_name_overrides")
    .select("algorithm_type, display_name")
    .eq("language", language)
    .in("algorithm_type", ALGORITHMS);

  const out: Partial<Record<AlgorithmType, string>> = {};
  for (const item of data || []) {
    const algorithmType = item?.algorithm_type as AlgorithmType;
    const displayName = typeof item?.display_name === "string" ? item.display_name : "";
    if (!ALGORITHMS.includes(algorithmType)) continue;
    if (displayName.trim()) out[algorithmType] = displayName.trim();
  }
  return out;
}

export async function getAlgorithmDisplayNamesForRequest(
  request: Request
): Promise<{ language: Language; names: Record<AlgorithmType, string> }> {
  const inCn = isChinaRequest(request);
  const fallbackLanguage: Language = inCn ? "zh" : "en";
  const language = parseLanguage(request.headers.get("x-lang"), fallbackLanguage);

  const overrides = inCn
    ? await readCnOverrides(language)
    : await readIntlOverrides(language);

  const names = Object.fromEntries(
    ALGORITHMS.map((algo) => [algo, overrides[algo] || getDefaultName(algo, language)])
  ) as Record<AlgorithmType, string>;

  return { language, names };
}

