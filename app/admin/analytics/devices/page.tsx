"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  RefreshCw,
  Loader2,
  Smartphone,
  Users,
  Clock3,
  Monitor,
  Globe,
  Search,
} from "lucide-react";

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
  region: "CN" | "INTL";
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

type SourceState = {
  mode: "local" | "proxy" | "unavailable";
  sampleSize: number;
  error?: string;
};

type ApiResponse = {
  success: boolean;
  generatedAt: string;
  combined: SideStats;
  cn: SideStats;
  intl: SideStats;
  sources: {
    cn: SourceState;
    intl: SourceState;
  };
  error?: string;
};

type DetailTab = "combined" | "cn" | "intl";

const PAGE_SIZE = 20;

const EMPTY: SideStats = {
  totalRecords: 0,
  uniqueUsers: 0,
  lastSeenAt: null,
  deviceTypes: [],
  os: [],
  browsers: [],
  platforms: [],
  appVersions: [],
  daily: [],
  recentRecords: [],
  detailTruncated: false,
};

function formatDateTime(input: string | null): string {
  if (!input) return "-";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function sourceBadge(source: SourceState) {
  if (source.mode === "local") {
    return <Badge className="bg-emerald-100 text-emerald-700">本地数据库</Badge>;
  }
  if (source.mode === "proxy") {
    return <Badge className="bg-blue-100 text-blue-700">跨域代理</Badge>;
  }
  return <Badge variant="destructive">不可用</Badge>;
}

function DistributionList({
  title,
  items,
}: {
  title: string;
  items: DistributionItem[];
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-sm text-slate-500">暂无数据</div>
        ) : (
          <div className="space-y-2">
            {items.slice(0, 8).map((item) => (
              <div key={item.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate pr-2">{item.name}</span>
                  <span className="text-slate-500">
                    {item.count} ({item.ratio.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-2 rounded bg-slate-100">
                  <div
                    className="h-2 rounded bg-blue-500"
                    style={{ width: `${Math.max(2, Math.min(100, item.ratio))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SidePanel({
  title,
  icon,
  stats,
  source,
}: {
  title: string;
  icon: React.ReactNode;
  stats: SideStats;
  source: SourceState;
}) {
  const recentDaily = useMemo(
    () => (stats.daily || []).slice(-7).reverse(),
    [stats.daily]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
          {sourceBadge(source)}
        </CardTitle>
        <CardDescription>
          样本 {source.sampleSize} 条
          {source.error ? ` · ${source.error}` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-6">
              <div className="text-xs text-slate-500">设备记录数</div>
              <div className="text-2xl font-bold">{stats.totalRecords}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-xs text-slate-500">涉及用户数</div>
              <div className="text-2xl font-bold">{stats.uniqueUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-xs text-slate-500">最新记录时间</div>
              <div className="text-sm font-medium">{formatDateTime(stats.lastSeenAt)}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          <DistributionList title="设备类型" items={stats.deviceTypes} />
          <DistributionList title="操作系统" items={stats.os} />
          <DistributionList title="浏览器" items={stats.browsers} />
          <DistributionList title="平台" items={stats.platforms} />
          <DistributionList title="App 版本" items={stats.appVersions} />
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">近 7 天活跃记录</CardTitle>
            </CardHeader>
            <CardContent>
              {recentDaily.length === 0 ? (
                <div className="text-sm text-slate-500">暂无数据</div>
              ) : (
                <div className="space-y-2 text-sm">
                  {recentDaily.map((point) => (
                    <div key={point.date} className="flex items-center justify-between">
                      <span>{point.date}</span>
                      <span className="font-medium">{point.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDeviceStatsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("combined");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/admin/devices/stats?source=ALL", {
        cache: "no-store",
        credentials: "include",
      });

      if (response.status === 401 || response.status === 403) {
        router.push("/admin/login");
        return;
      }

      const payload = (await response.json()) as ApiResponse;
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "加载失败");
      }
      setData(payload);
    } catch (err: any) {
      setError(err?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(1);
  }, [detailTab, keyword]);

  const currentDetailStats =
    detailTab === "cn"
      ? data?.cn || EMPTY
      : detailTab === "intl"
        ? data?.intl || EMPTY
        : data?.combined || EMPTY;

  const detailRows = useMemo(() => {
    const raw = currentDetailStats.recentRecords || [];
    const q = keyword.trim().toLowerCase();
    if (!q) return raw;
    return raw.filter((row) => {
      const hit = [
        row.region,
        row.userId || "",
        row.deviceType,
        row.os,
        row.browser,
        row.platform,
        row.appVersion,
        row.category,
        row.message,
        row.timestamp,
      ]
        .join(" ")
        .toLowerCase();
      return hit.includes(q);
    });
  }, [currentDetailStats.recentRecords, keyword]);

  const totalPages = Math.max(1, Math.ceil(detailRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = detailRows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">设备统计</h1>
          <p className="text-slate-500 mt-1">
            同时展示 CN（Cloudbase）与 INTL（Supabase）设备数据
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchStats} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            刷新
          </Button>
          <Link href="/admin">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回
            </Button>
          </Link>
        </div>
      </div>

      {error ? (
        <Card>
          <CardContent className="pt-6 text-red-600">{error}</CardContent>
        </Card>
      ) : null}

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-blue-600" />
                全局汇总（CN + INTL）
              </CardTitle>
              <CardDescription>更新时间：{formatDateTime(data?.generatedAt || null)}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg border p-4">
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <Monitor className="h-4 w-4" />
                  设备记录总数
                </div>
                <div className="text-3xl font-bold mt-1">{data?.combined?.totalRecords || 0}</div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  涉及用户总数
                </div>
                <div className="text-3xl font-bold mt-1">{data?.combined?.uniqueUsers || 0}</div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock3 className="h-4 w-4" />
                  最近记录
                </div>
                <div className="text-sm font-medium mt-2">{formatDateTime(data?.combined?.lastSeenAt || null)}</div>
              </div>
            </CardContent>
          </Card>

          <SidePanel
            title="CN 环境（Cloudbase）"
            icon={<Globe className="h-5 w-5 text-red-500" />}
            stats={data?.cn || EMPTY}
            source={data?.sources?.cn || { mode: "unavailable", sampleSize: 0 }}
          />

          <SidePanel
            title="INTL 环境（Supabase）"
            icon={<Globe className="h-5 w-5 text-blue-500" />}
            stats={data?.intl || EMPTY}
            source={data?.sources?.intl || { mode: "unavailable", sampleSize: 0 }}
          />

          <Card>
            <CardHeader>
              <CardTitle>设备明细列表</CardTitle>
              <CardDescription>按时间倒序展示最近设备记录（支持 CN/INTL/汇总切换）</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                {([
                  ["combined", "汇总"],
                  ["cn", "CN"],
                  ["intl", "INTL"],
                ] as const).map(([key, label]) => (
                  <Button
                    key={key}
                    size="sm"
                    variant={detailTab === key ? "default" : "outline"}
                    onClick={() => setDetailTab(key)}
                  >
                    {label}
                  </Button>
                ))}
                <span className="text-sm text-slate-500 ml-2">
                  共 {detailRows.length} 条
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-full md:max-w-sm">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="搜索：用户ID / OS / 浏览器 / 平台 / 版本 / 类别 / 消息"
                    className="w-full h-9 pl-9 pr-3 border rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {currentDetailStats.detailTruncated ? (
                  <Badge variant="outline" className="text-amber-700 border-amber-300">
                    仅展示最新 1000 条
                  </Badge>
                ) : null}
              </div>

              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="border-b">
                      <th className="text-left px-3 py-2">环境</th>
                      <th className="text-left px-3 py-2">时间</th>
                      <th className="text-left px-3 py-2">用户ID</th>
                      <th className="text-left px-3 py-2">设备类型</th>
                      <th className="text-left px-3 py-2">操作系统</th>
                      <th className="text-left px-3 py-2">浏览器</th>
                      <th className="text-left px-3 py-2">平台</th>
                      <th className="text-left px-3 py-2">App版本</th>
                      <th className="text-left px-3 py-2">类别</th>
                      <th className="text-left px-3 py-2">消息</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-3 py-6 text-center text-slate-500">
                          暂无明细数据
                        </td>
                      </tr>
                    ) : (
                      pageRows.map((row, index) => (
                        <tr key={`${row.timestamp}-${row.userId || "na"}-${index}`} className="border-b last:border-0">
                          <td className="px-3 py-2">
                            <Badge variant={row.region === "CN" ? "outline" : "secondary"}>{row.region}</Badge>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(row.timestamp)}</td>
                          <td className="px-3 py-2 font-mono text-xs">{row.userId || "-"}</td>
                          <td className="px-3 py-2">{row.deviceType || "-"}</td>
                          <td className="px-3 py-2">{row.os || "-"}</td>
                          <td className="px-3 py-2">{row.browser || "-"}</td>
                          <td className="px-3 py-2">{row.platform || "-"}</td>
                          <td className="px-3 py-2">{row.appVersion || "-"}</td>
                          <td className="px-3 py-2">{row.category || "-"}</td>
                          <td className="px-3 py-2 max-w-[320px] truncate" title={row.message || ""}>
                            {row.message || "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-500">
                  第 {currentPage} / {totalPages} 页
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    上一页
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
