"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, X, Eye, Copy } from "lucide-react";

type RegionView = "all" | "cn" | "intl";

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
  raw?: any;
};

type UsersData = {
  region: RegionView;
  users: NormalizedUser[];
  total: number;
  page: number;
  pageSize: number;
  sources?: {
    cn: { ok: boolean; total: number; missing?: string[]; error?: string };
    intl: { ok: boolean; total: number; missing?: string[]; error?: string };
  };
};

function safeText(value: any): string {
  if (value == null) return "-";
  const s = typeof value === "string" ? value : String(value);
  return s.trim() ? s : "-";
}

function shortId(value: any) {
  const s = typeof value === "string" ? value : value == null ? "" : String(value);
  return s ? `${s.slice(0, 8)}...` : "-";
}

function formatDateTime(value: any) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function calcAgeFromBirthDate(birthDate: any): number | null {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 && age < 150 ? age : null;
}

function getPageItems(currentPage: number, pagesTotal: number) {
  const total = Math.max(0, Math.floor(pagesTotal));
  const current = Math.min(Math.max(1, Math.floor(currentPage)), Math.max(1, total));

  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = new Set<number>();
  pages.add(1);
  pages.add(total);

  for (let p = current - 2; p <= current + 2; p += 1) {
    if (p >= 1 && p <= total) pages.add(p);
  }

  const sorted = Array.from(pages).sort((a, b) => a - b);
  const items: Array<number | "ellipsis"> = [];
  for (let i = 0; i < sorted.length; i += 1) {
    const value = sorted[i];
    const prev = sorted[i - 1];
    if (i > 0 && value - prev > 1) items.push("ellipsis");
    items.push(value);
  }
  return items;
}

export default function AdminUsersPage() {
  const [data, setData] = useState<UsersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<RegionView>("all");
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<NormalizedUser | null>(null);

  const trimmedQ = useMemo(() => q.trim(), [q]);

  useEffect(() => {
    let cancelled = false;

    async function fetchUsers(region: RegionView) {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("pageSize", "20");
        params.set(
          "source",
          region === "cn" ? "CN" : region === "intl" ? "INTL" : "ALL"
        );
        if (trimmedQ) params.set("q", trimmedQ);

        const response = await fetch(`/api/admin/users?${params.toString()}`, {
          cache: "no-store",
        });
        if (response.ok) {
          const result = await response.json();
          if (!cancelled) setData(result);
          return;
        }

        const errorBody = await response.json().catch(() => null);
        console.error("获取用户列表失败:", errorBody || response.statusText);
        if (!cancelled) {
          setData({
            region,
            users: [],
            total: 0,
            page,
            pageSize: 20,
          } as UsersData);
        }
      } catch (error) {
        console.error("获取用户列表失败:", error);
        if (!cancelled) {
          setData({
            region,
            users: [],
            total: 0,
            page,
            pageSize: 20,
          } as UsersData);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchUsers(view);
    return () => {
      cancelled = true;
    };
  }, [page, view, trimmedQ]);

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;
  const cnCount = data?.region === "all" ? data.sources?.cn.total || 0 : undefined;
  const intlCount =
    data?.region === "all" ? data.sources?.intl.total || 0 : undefined;
  const sourceWarning =
    data?.region === "all" &&
    data.sources &&
    (!data.sources.cn.ok || !data.sources.intl.ok);

  const users = data?.users || [];

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">用户管理</h1>
          <p className="text-slate-500 mt-1">
            {view === "all" && data?.region === "all"
              ? `查看平台用户（共 ${data?.total || 0} 人，CN ${cnCount || 0} 人 / INTL ${intlCount || 0} 人）`
              : `查看平台用户（共 ${data?.total || 0} 人）`}
          </p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <Select
            value={view}
            onValueChange={(value) => {
              const next = value as RegionView;
              setView(next);
              setPage(1);
              setDetail(null);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="选择区域" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部用户</SelectItem>
              <SelectItem value="cn">CN 用户</SelectItem>
              <SelectItem value="intl">INTL 用户</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative w-full md:w-[320px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="搜索：ID / 用户名 / 邮箱 / 手机号"
              className="pl-9 pr-9"
            />
            {trimmedQ ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-7 w-7 p-0"
                onClick={() => setQ("")}
                aria-label="清除搜索"
              >
                <X className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>用户列表</CardTitle>
        </CardHeader>
        <CardContent>
          {sourceWarning ? (
            <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              部分数据源不可用：CN {data?.sources?.cn.ok ? "正常" : "不可用"} /
              INTL {data?.sources?.intl.ok ? "正常" : "不可用"}
            </div>
          ) : null}

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-slate-500">加载中...</div>
            </div>
          ) : !data || users.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-slate-500">暂无用户数据</div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>区域</TableHead>
                      <TableHead>用户</TableHead>
                      <TableHead>账号</TableHead>
                      <TableHead>资料</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>创建时间</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user, index) => {
                      const age =
                        user.age ?? calcAgeFromBirthDate(user.birth_date);
                      const profileLine = [
                        user.city_name,
                        user.education_level,
                        user.occupation,
                        user.mbti,
                      ]
                        .map((x) => (typeof x === "string" ? x.trim() : ""))
                        .filter(Boolean)
                        .join(" / ");

                      return (
                        <TableRow
                          key={`${user.region}_${user.id || "unknown"}_${user.created_at || ""}_${index}`}
                        >
                          <TableCell>
                            <Badge
                              variant={user.region === "CN" ? "outline" : "secondary"}
                            >
                              {user.region}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {safeText(user.username) !== "-"
                                  ? safeText(user.username)
                                  : shortId(user.id)}
                              </span>
                              <span
                                className="text-xs text-slate-500 font-mono break-all max-w-[260px]"
                                title={user.id}
                              >
                                {user.id || "-"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm">
                                {safeText(user.email) !== "-" ? safeText(user.email) : "-"}
                              </span>
                              <span className="text-xs text-slate-500">
                                {safeText(user.phone)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm">
                                {user.gender ? safeText(user.gender) : "-"}
                                {typeof age === "number" ? `，${age}岁` : ""}
                              </span>
                              <span className="text-xs text-slate-500">
                                {profileLine || "-"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                user.account_status === "active"
                                  ? "default"
                                  : user.account_status
                                    ? "secondary"
                                    : "outline"
                              }
                            >
                              {user.account_status ? safeText(user.account_status) : "-"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDateTime(user.created_at)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyText(user.id)}
                                aria-label="复制用户ID"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDetail(user)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                详情
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-slate-500">
                  第 {page} 页,共 {totalPages} 页
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={loading || page === 1}
                  >
                    上一页
                  </Button>
                  <div className="flex items-center gap-1 flex-wrap">
                    {getPageItems(page, totalPages).map((item, idx) =>
                      item === "ellipsis" ? (
                        <Button
                          key={`ellipsis_${idx}`}
                          variant="ghost"
                          size="sm"
                          disabled
                          className="px-2"
                        >
                          ...
                        </Button>
                      ) : (
                        <Button
                          key={`page_${item}`}
                          variant={item === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPage(item)}
                          disabled={loading || item === page}
                          className="min-w-9"
                          aria-label={`跳转到第 ${item} 页`}
                        >
                          {item}
                        </Button>
                      )
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={loading || page === totalPages || totalPages === 0}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={(open) => (!open ? setDetail(null) : null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>用户详情</DialogTitle>
          </DialogHeader>
          {detail ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={detail.region === "CN" ? "outline" : "secondary"}>
                    {detail.region}
                  </Badge>
                  <span className="font-mono text-xs break-all">{detail.id}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyText(detail.id)}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  复制ID
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="rounded-md border p-3">
                  <div className="text-xs text-slate-500">用户名</div>
                  <div className="mt-1 font-medium">{safeText(detail.username)}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-slate-500">状态</div>
                  <div className="mt-1 font-medium">{safeText(detail.account_status)}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-slate-500">邮箱</div>
                  <div className="mt-1 font-medium break-all">{safeText(detail.email)}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-slate-500">手机号</div>
                  <div className="mt-1 font-medium break-all">{safeText(detail.phone)}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-slate-500">创建时间</div>
                  <div className="mt-1 font-medium">{formatDateTime(detail.created_at)}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-slate-500">最近活跃</div>
                  <div className="mt-1 font-medium">
                    {formatDateTime(detail.last_active_at)}
                  </div>
                </div>
              </div>

              <div className="rounded-md border p-3">
                <div className="text-xs text-slate-500">完整数据</div>
                <div className="mt-2 max-h-[420px] overflow-auto rounded bg-slate-50 p-3 text-xs">
                  <pre className="whitespace-pre-wrap break-words">
                    {JSON.stringify(detail.raw ?? detail, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
