"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { MacOSArchType, PlatformType } from "@/lib/config/download.config";

type RegionKey = "cn" | "intl";
type SourceRegion = "CN" | "INTL";

type AdminRelease = {
  id: string;
  platform: PlatformType;
  arch: MacOSArchType | null;
  version: string;
  fileName: string;
  fileSize: number | null;
  contentType: string | null;
  isActive: boolean;
  releaseNotes: string | null;
  createdAt: string | number | null;
  updatedAt: string | number | null;
  source: SourceRegion;
  storage: {
    provider: "cloudbase" | "supabase";
    fileIdOrPath?: string;
    bucket?: string;
    path?: string;
  };
};

type AdminReleasesResponse = {
  cn?: AdminRelease[];
  intl?: AdminRelease[];
};

const PLATFORM_OPTIONS: Array<{ value: PlatformType; label: string }> = [
  { value: "android", label: "Android" },
  { value: "ios", label: "iOS" },
  { value: "windows", label: "Windows" },
  { value: "macos", label: "macOS" },
  { value: "linux", label: "Linux" },
];

const ARCH_OPTIONS: Array<{ value: MacOSArchType; label: string }> = [
  { value: "intel", label: "Intel" },
  { value: "apple-silicon", label: "Apple Silicon" },
];

function formatBytes(bytes: number | null): string {
  if (!bytes || !Number.isFinite(bytes) || bytes <= 0) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let idx = 0;
  while (size >= 1024 && idx < units.length - 1) {
    size /= 1024;
    idx += 1;
  }
  return `${size.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

function normalizeArchForPlatform(platform: PlatformType, arch: MacOSArchType | null): MacOSArchType | null {
  if (platform !== "macos") return null;
  return arch;
}

export default function AdminReleasesPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<RegionKey>("cn");
  const [availableRegions, setAvailableRegions] = useState<Record<RegionKey, boolean>>({
    cn: true,
    intl: true,
  });
  const [data, setData] = useState<Record<RegionKey, AdminRelease[]>>({
    cn: [],
    intl: [],
  });

  const [uploadState, setUploadState] = useState<
    Record<
      RegionKey,
      {
        platform: PlatformType;
        arch: MacOSArchType | null;
        version: string;
        releaseNotes: string;
        setActive: boolean;
        file: File | null;
        uploading: boolean;
      }
    >
  >({
    cn: { platform: "windows", arch: null, version: "", releaseNotes: "", setActive: true, file: null, uploading: false },
    intl: { platform: "windows", arch: null, version: "", releaseNotes: "", setActive: true, file: null, uploading: false },
  });

  const tabMeta = useMemo(
    () => [
      { key: "cn" as const, label: "CN（CloudBase）", source: "CN" as const },
      { key: "intl" as const, label: "INTL（Supabase）", source: "INTL" as const },
    ],
    []
  );

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/releases", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = (await res.json()) as AdminReleasesResponse;
      setData({
        cn: payload.cn || [],
        intl: payload.intl || [],
      });
      setAvailableRegions({
        cn: !!payload.cn,
        intl: !!payload.intl,
      });
    } catch {
      toast({
        title: "加载失败",
        description: "无法获取版本列表，请稍后重试。",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  async function getHttpErrorMessage(res: Response): Promise<string> {
    try {
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const json = (await res.json().catch(() => null)) as any;
        const msg = typeof json?.error === "string" ? json.error : "";
        if (msg) return msg;
      }
      const text = await res.text().catch(() => "");
      if (text) return text.slice(0, 200);
    } catch {}
    return `HTTP ${res.status}`;
  }

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  function updateUploadState(region: RegionKey, patch: Partial<(typeof uploadState)[RegionKey]>) {
    setUploadState((prev) => ({
      ...prev,
      [region]: {
        ...prev[region],
        ...patch,
      },
    }));
  }

  async function handleUpload(region: RegionKey, source: SourceRegion) {
    const state = uploadState[region];
    const platform = state.platform;
    const arch = normalizeArchForPlatform(platform, state.arch);
    const version = state.version.trim();
    const releaseNotes = state.releaseNotes.trim();
    const file = state.file;
    const setActive = state.setActive;

    if (!version) {
      toast({ title: "请输入版本号", variant: "destructive" });
      return;
    }
    if (platform === "macos" && !arch) {
      toast({ title: "请选择 macOS 架构", variant: "destructive" });
      return;
    }
    if (!file) {
      toast({ title: "请选择安装包文件", variant: "destructive" });
      return;
    }

    updateUploadState(region, { uploading: true });
    try {
      if (source === "CN") {
        const params = new URLSearchParams({
          platform,
          version,
          setActive: setActive ? "1" : "0",
        });
        if (arch) params.set("arch", arch);
        params.set("fileSize", String(file.size));
        if (releaseNotes) params.set("releaseNotes", releaseNotes);

        const res = await fetch(`/api/admin/releases/upload?${params.toString()}`, {
          method: "POST",
          headers: {
            "content-type": file.type || "application/octet-stream",
            "x-file-name": file.name,
          },
          body: file,
        });
        if (!res.ok) throw new Error(await getHttpErrorMessage(res));
      } else {
        const prepare = await fetch("/api/admin/releases/prepare-upload", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            source: "INTL",
            platform,
            arch,
            version,
            fileName: file.name,
          }),
        });
        if (!prepare.ok) throw new Error(await getHttpErrorMessage(prepare));
        const prepPayload = (await prepare.json()) as { bucket: string; path: string; token: string };
        if (!prepPayload?.bucket || !prepPayload?.path || !prepPayload?.token) {
          throw new Error("Invalid prepare payload");
        }

        const supabase = getSupabaseClient();
        const uploadRes = await supabase.storage
          .from(prepPayload.bucket)
          // @ts-ignore - signature differs across versions, token upload is supported by supabase-js v2
          .uploadToSignedUrl(prepPayload.path, prepPayload.token, file, {
            contentType: file.type || "application/octet-stream",
            upsert: false,
          });
        if (uploadRes?.error) throw new Error(uploadRes.error.message);

        const register = await fetch("/api/admin/releases/register", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            source: "INTL",
            platform,
            arch,
            version,
            fileName: file.name,
            bucket: prepPayload.bucket,
            path: prepPayload.path,
            fileSize: file.size,
            contentType: file.type || "application/octet-stream",
            releaseNotes: releaseNotes || null,
            setActive,
          }),
        });
        if (!register.ok) throw new Error(await getHttpErrorMessage(register));
      }

      toast({ title: "上传成功" });
      updateUploadState(region, { file: null });
      await fetchAll();
    } catch (e: any) {
      toast({
        title: "上传失败",
        description: e?.message ? String(e.message) : "写入失败，可能是目标环境未配置或代理不可用。",
        variant: "destructive",
      });
    } finally {
      updateUploadState(region, { uploading: false });
    }
  }

  async function handleActivate(item: AdminRelease) {
    try {
      const res = await fetch("/api/admin/releases/activate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          source: item.source,
          id: item.id,
          platform: item.platform,
          arch: item.arch,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast({ title: "已设为当前版本" });
      await fetchAll();
    } catch {
      toast({ title: "操作失败", variant: "destructive" });
    }
  }

  async function handleDelete(item: AdminRelease) {
    try {
      const res = await fetch("/api/admin/releases/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source: item.source, id: item.id }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast({ title: "已删除" });
      await fetchAll();
    } catch {
      toast({ title: "删除失败", variant: "destructive" });
    }
  }

  async function handleDownload(item: AdminRelease) {
    try {
      if (item.source === "CN" && !item.storage?.fileIdOrPath) {
        throw new Error("该记录缺少 Cloudbase fileIdOrPath，无法生成下载链接");
      }
      if (item.source === "INTL" && (!item.storage?.bucket || !item.storage?.path)) {
        throw new Error("该记录缺少 Supabase storage_bucket/storage_path，无法生成下载链接");
      }
      const res = await fetch("/api/admin/releases/signed-download", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source: item.source, id: item.id }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = (await res.json()) as { url?: string };
      if (!payload?.url) throw new Error("missing url");
      window.open(payload.url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast({
        title: "获取下载链接失败",
        description: e?.message ? String(e.message) : undefined,
        variant: "destructive",
      });
    }
  }

  function renderRegion(region: RegionKey, title: string, source: SourceRegion) {
    const state = uploadState[region];
    const platform = state.platform;
    const isMac = platform === "macos";
    const arch = normalizeArchForPlatform(platform, state.arch);
    const disabled = loading || state.uploading;
    const list = data[region];

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{title}</span>
              <Button variant="outline" size="sm" onClick={fetchAll} disabled={disabled}>
                刷新
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!availableRegions[region] && (
              <div className="text-sm text-slate-500">
                当前环境暂时无法读取该侧数据（可能缺少数据库配置或跨环境代理失败）。页面仍可显示结构以便查看。
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">平台</div>
                <Select
                  value={state.platform}
                  onValueChange={(v) =>
                    updateUploadState(region, {
                      platform: v as PlatformType,
                      arch: v === "macos" ? state.arch : null,
                    })
                  }
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择平台" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORM_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">版本号</div>
                <Input
                  value={state.version}
                  onChange={(e) => updateUploadState(region, { version: e.target.value })}
                  placeholder="例如 1.2.3"
                  disabled={disabled}
                />
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">macOS 架构</div>
                <Select
                  value={arch || ""}
                  onValueChange={(v) => updateUploadState(region, { arch: (v as MacOSArchType) || null })}
                  disabled={disabled || !isMac}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isMac ? "选择架构" : "非 macOS 无需选择"} />
                  </SelectTrigger>
                  <SelectContent>
                    {ARCH_OPTIONS.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">安装包文件</div>
                <Input
                  type="file"
                  onChange={(e) => updateUploadState(region, { file: e.target.files?.[0] || null })}
                  disabled={disabled}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">更新说明（可选）</div>
              <Textarea
                value={state.releaseNotes}
                onChange={(e) => updateUploadState(region, { releaseNotes: e.target.value })}
                placeholder="简单描述本版本变更"
                disabled={disabled}
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={state.setActive}
                  onChange={(e) => updateUploadState(region, { setActive: e.target.checked })}
                  disabled={disabled}
                />
                上传后设为当前版本
              </label>

              <Button onClick={() => handleUpload(region, source)} disabled={disabled}>
                {state.uploading ? "上传中..." : "上传"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>版本列表</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">平台</TableHead>
                  <TableHead className="w-[140px]">版本</TableHead>
                  <TableHead>文件</TableHead>
                  <TableHead className="w-[110px]">大小</TableHead>
                  <TableHead className="w-[110px]">状态</TableHead>
                  <TableHead className="w-[240px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-slate-500 py-8">
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  list.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.platform}
                        {item.platform === "macos" && item.arch ? ` (${item.arch})` : ""}
                      </TableCell>
                      <TableCell>{item.version}</TableCell>
                      <TableCell className="truncate max-w-[420px]" title={item.fileName}>
                        {item.fileName}
                      </TableCell>
                      <TableCell>{formatBytes(item.fileSize)}</TableCell>
                      <TableCell>{item.isActive ? "当前" : "-"}</TableCell>
                      <TableCell className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleDownload(item)} disabled={disabled}>
                          下载
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleActivate(item)}
                          disabled={disabled || item.isActive}
                        >
                          设为当前
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(item)} disabled={disabled}>
                          删除
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">版本管理</h1>
        <p className="text-slate-500 mt-1">管理 /download 安装包（CN + INTL 均可查看与上传）</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as RegionKey)}>
        <TabsList>
          {tabMeta.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabMeta.map((t) => (
          <TabsContent key={t.key} value={t.key} className="mt-4">
            {renderRegion(t.key, t.label, t.source)}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
