import { NextRequest, NextResponse } from "next/server";
import { getDownloadConfig, type DownloadItem, type PlatformType, type MacOSArchType } from "@/lib/config/download.config";
import { getDeploymentRegionFromRequest } from "@/lib/config/request-region";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Region = "CN" | "INTL";

function parseRegion(value: string | null): Region | null {
  if (!value) return null;
  const v = value.toUpperCase();
  if (v === "CN" || v === "INTL") return v as Region;
  return null;
}

function makeKey(platform: PlatformType, arch?: MacOSArchType): string {
  return `${platform}:${arch || ""}`;
}

function mergeDownloads(base: DownloadItem[], overrides: Map<string, Partial<DownloadItem>>): DownloadItem[] {
  return base.map((item) => {
    const key = makeKey(item.platform, item.arch);
    const patch = overrides.get(key);
    if (!patch) return item;
    return { ...item, ...patch, available: true };
  });
}

async function getCnOverrides(): Promise<Map<string, Partial<DownloadItem>>> {
  try {
    // @ts-ignore
    const cloudbase = await import("@cloudbase/node-sdk");
    const env = process.env.CLOUDBASE_ENV_ID || process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID || "";
    if (!env || !process.env.CLOUDBASE_SECRET_ID || !process.env.CLOUDBASE_SECRET_KEY) return new Map();

    const app = cloudbase.init({
      env,
      secretId: process.env.CLOUDBASE_SECRET_ID,
      secretKey: process.env.CLOUDBASE_SECRET_KEY,
    });

    const db = app.database();
    const res = await db
      .collection("releases")
      .where({ isActive: true })
      .field({ platform: true, arch: true, fileIdOrPath: true, fileName: true })
      .get()
      .catch(() => ({ data: [] as any[] }));

    const out = new Map<string, Partial<DownloadItem>>();
    for (const row of res.data || []) {
      const platform = typeof row?.platform === "string" ? (row.platform.toLowerCase() as PlatformType) : undefined;
      const arch =
        typeof row?.arch === "string"
          ? ((row.arch.toLowerCase() as MacOSArchType) || undefined)
          : ((row?.arch as MacOSArchType | null) || undefined);
      const fileID =
        (typeof row?.fileIdOrPath === "string" && row.fileIdOrPath) ||
        (typeof row?.fileID === "string" && row.fileID) ||
        (typeof row?.fileId === "string" && row.fileId) ||
        (typeof row?.cloudPath === "string" && row.cloudPath) ||
        "";
      if (!platform || !fileID) continue;
      const patch: Partial<DownloadItem> = { fileID };
      const fileName =
        (typeof row?.fileName === "string" && row.fileName.trim()) ||
        (typeof row?.file_name === "string" && row.file_name.trim()) ||
        "";
      if (fileName) patch.fileName = fileName;
      out.set(makeKey(platform, arch), patch);
    }
    return out;
  } catch {
    return new Map();
  }
}

async function getIntlOverrides(): Promise<Map<string, Partial<DownloadItem>>> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("releases")
      .select("platform, arch, file_name, storage_bucket, storage_path")
      .eq("is_active", true);

    const out = new Map<string, Partial<DownloadItem>>();
    for (const row of data || []) {
      const platform = typeof row?.platform === "string" ? (row.platform.toLowerCase() as PlatformType) : undefined;
      const arch =
        typeof row?.arch === "string"
          ? ((row.arch.toLowerCase() as MacOSArchType) || undefined)
          : ((row?.arch as MacOSArchType | null) || undefined);
      const bucket = typeof row?.storage_bucket === "string" ? row.storage_bucket : "";
      const path = typeof row?.storage_path === "string" ? row.storage_path : "";
      if (!platform || !bucket || !path) continue;

      const patch: Partial<DownloadItem> = {
        url: `supabase://${bucket}/${path}`,
      };
      if (typeof row?.file_name === "string" && row.file_name.trim()) patch.fileName = row.file_name.trim();
      out.set(makeKey(platform, arch), patch);
    }
    return out;
  } catch {
    return new Map();
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const regionParam = parseRegion(url.searchParams.get("region"));
    const region: Region = regionParam || getDeploymentRegionFromRequest(request);

    const base = getDownloadConfig(region).downloads;

    if (region === "CN") {
      const overrides = await getCnOverrides();
      return NextResponse.json({ region, downloads: mergeDownloads(base, overrides) });
    }

    const overrides = await getIntlOverrides();
    return NextResponse.json({ region, downloads: mergeDownloads(base, overrides) });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
