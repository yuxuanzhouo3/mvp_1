"use client";

import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Order {
  id: string;
  region: "CN" | "INTL";
  user_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  created_at: string;
  users?: {
    username?: string;
    email?: string;
  };
  metadata?: any;
}

interface OrdersData {
  region: "cn" | "intl" | "all";
  orders: Order[];
  total: number;
  page: number;
  pageSize: number;
  sources?: {
    cn: { ok: boolean; total: number; missing?: string[]; error?: string };
    intl: { ok: boolean; total: number; missing?: string[]; error?: string };
  };
}

export default function AdminOrdersPage() {
  const [data, setData] = useState<OrdersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [view, setView] = useState<"all" | "cn" | "intl">("all");

  useEffect(() => {
    let cancelled = false;

    async function fetchOrders(region: "all" | "cn" | "intl") {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/admin/orders?page=${page}&pageSize=20&status=${status}&region=${region}`
        );
        if (response.ok) {
          const result = await response.json();
          if (!cancelled) setData(result);
          return;
        }

        const errorBody = await response.json().catch(() => null);
        console.error("获取订单列表失败:", errorBody || response.statusText);
        if (!cancelled) setData({ region, orders: [], total: 0, page, pageSize: 20 } as OrdersData);
      } catch (error) {
        console.error("获取订单列表失败:", error);
        if (!cancelled) setData({ region, orders: [], total: 0, page, pageSize: 20 } as OrdersData);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchOrders(view);
    return () => {
      cancelled = true;
    };
  }, [page, status, view]);

  function getStatusBadge(status: string) {
    const statusMap: Record<string, { label: string; variant: any }> = {
      pending: { label: "待支付", variant: "secondary" },
      completed: { label: "已完成", variant: "default" },
      success: { label: "已完成", variant: "default" },
      failed: { label: "失败", variant: "destructive" },
      refunded: { label: "已退款", variant: "outline" },
    };

    const config = statusMap[status] || { label: status, variant: "secondary" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  }

  function shortId(value: any) {
    const s = typeof value === "string" ? value : value == null ? "" : String(value);
    return s ? `${s.slice(0, 8)}...` : "-";
  }

  function formatDate(dateString: string) {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatAmount(amount: number, currency: string) {
    const safeCurrency = (currency || "").toUpperCase();
    const locale = safeCurrency === "CNY" ? "zh-CN" : "en-US";
    const resolvedCurrency = safeCurrency === "CNY" || safeCurrency === "USD" ? safeCurrency : "USD";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: resolvedCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
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

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;
  const cnCount = data?.region === "all" ? data.sources?.cn.total || 0 : undefined;
  const intlCount = data?.region === "all" ? data.sources?.intl.total || 0 : undefined;
  const sourceWarning =
    data?.region === "all" &&
    data.sources &&
    (!data.sources.cn.ok || !data.sources.intl.ok);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">交易订单</h1>
          <p className="text-slate-500 mt-1">
            {view === "all" && data?.region === "all"
              ? `查看和管理所有交易订单 (共 ${data?.total || 0} 条，CN ${cnCount || 0} 条 / INTL ${intlCount || 0} 条)`
              : `查看和管理所有交易订单 (共 ${data?.total || 0} 条)`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select
            value={view}
            onValueChange={(value) => {
              const next = value as "all" | "cn" | "intl";
              setView(next);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="选择区域" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部订单</SelectItem>
              <SelectItem value="cn">CN 订单</SelectItem>
              <SelectItem value="intl">INTL 订单</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="筛选状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="pending">待支付</SelectItem>
              <SelectItem value="completed">已完成</SelectItem>
              <SelectItem value="failed">失败</SelectItem>
              <SelectItem value="refunded">已退款</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>订单列表</CardTitle>
        </CardHeader>
        <CardContent>
          {sourceWarning ? (
            <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              部分数据源不可用：CN {data?.sources?.cn.ok ? "正常" : "不可用"} / INTL{" "}
              {data?.sources?.intl.ok ? "正常" : "不可用"}
            </div>
          ) : null}

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-slate-500">加载中...</div>
            </div>
          ) : !data || data.orders.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-slate-500">暂无订单数据</div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>区域</TableHead>
                      <TableHead>订单ID</TableHead>
                      <TableHead>用户</TableHead>
                      <TableHead>金额</TableHead>
                      <TableHead>支付方式</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>创建时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.orders.map((order, index) => (
                      <TableRow key={`${order.region}_${order.id || order.user_id || index}`}>
                        <TableCell>
                          <Badge variant={order.region === "CN" ? "outline" : "secondary"}>
                            {order.region}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs break-all max-w-[260px]">
                          <span title={order.id}>{order.id || "-"}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {order.users?.username || "未知用户"}
                            </span>
                            <span className="text-xs text-slate-500">
                              {order.users?.email || shortId(order.user_id)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatAmount(order.amount, order.currency)}
                        </TableCell>
                        <TableCell>
                          {order.payment_method === "wechat" && "微信支付"}
                          {order.payment_method === "alipay" && "支付宝"}
                          {order.payment_method === "stripe" && "Stripe"}
                          {order.payment_method === "paypal" && "PayPal"}
                          {!["wechat", "alipay", "stripe", "paypal"].includes(
                            order.payment_method
                          ) && order.payment_method}
                        </TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell className="text-sm">{formatDate(order.created_at)}</TableCell>
                      </TableRow>
                    ))}
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
    </div>
  );
}
