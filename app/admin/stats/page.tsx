"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  ShoppingCart,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Badge } from "@/components/ui/badge";

interface StatsData {
  cn: {
    totalUsers: number;
    todayUsers: number;
    totalOrders: number;
    todayOrders: number;
    totalRevenueCny: number;
    todayRevenueCny: number;
  };
  intl: {
    totalUsers: number;
    todayUsers: number;
    totalOrders: number;
    todayOrders: number;
    totalRevenueUsd: number;
    todayRevenueUsd: number;
  };
  total: {
    totalUsers: number;
    todayUsers: number;
    totalOrders: number;
    todayOrders: number;
    totalRevenueCny: number;
    todayRevenueCny: number;
    totalRevenueUsd: number;
    todayRevenueUsd: number;
  };
  userGrowth: Array<{ date: string; cn: number; intl: number; total: number }>;
  revenueGrowth: Array<{ date: string; cn: number; intl: number }>;
}

export default function AdminStatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const response = await fetch("/api/admin/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("获取统计数据失败:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">加载中...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">加载数据失败</div>
      </div>
    );
  }

  const formatCurrency = (amount: number, currency: "CNY" | "USD") => {
    const locale = currency === "CNY" ? "zh-CN" : "en-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">数据统计</h1>
        <p className="text-slate-500 mt-1">查看平台运营数据（CN + INTL）</p>
      </div>

      {/* 总计统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              总用户数
            </CardTitle>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total.totalUsers}</div>
            <p className="text-xs text-slate-500 mt-1">+{stats.total.todayUsers} 今日</p>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className="text-xs">CN: {stats.cn.totalUsers}</Badge>
              <Badge variant="outline" className="text-xs">INTL: {stats.intl.totalUsers}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              总订单数
            </CardTitle>
            <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
              <ShoppingCart className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total.totalOrders}</div>
            <p className="text-xs text-slate-500 mt-1">+{stats.total.todayOrders} 今日</p>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className="text-xs">CN: {stats.cn.totalOrders}</Badge>
              <Badge variant="outline" className="text-xs">INTL: {stats.intl.totalOrders}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              总收入
            </CardTitle>
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
              <DollarSign className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex flex-col">
              <span>{formatCurrency(stats.cn.totalRevenueCny, "CNY")}</span>
              <span>{formatCurrency(stats.intl.totalRevenueUsd, "USD")}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              +{formatCurrency(stats.cn.todayRevenueCny, "CNY")} / +{formatCurrency(stats.intl.todayRevenueUsd, "USD")} 今日
            </p>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                CN: {formatCurrency(stats.cn.totalRevenueCny, "CNY")}
              </Badge>
              <Badge variant="outline" className="text-xs">
                INTL: {formatCurrency(stats.intl.totalRevenueUsd, "USD")}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              用户增长
            </CardTitle>
            <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20">
              <TrendingUp className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total.todayUsers}</div>
            <p className="text-xs text-slate-500 mt-1">今日新增</p>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className="text-xs">CN: {stats.cn.todayUsers}</Badge>
              <Badge variant="outline" className="text-xs">INTL: {stats.intl.todayUsers}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 用户增长图表 */}
      <Card>
        <CardHeader>
          <CardTitle>用户增长趋势（最近7天）</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.userGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => {
                    const date = new Date(value as string);
                    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="cn"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="CN 用户"
                />
                <Line
                  type="monotone"
                  dataKey="intl"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="INTL 用户"
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="总计"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 收入增长图表 */}
      <Card>
        <CardHeader>
          <CardTitle>收入增长趋势（最近7天）</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.revenueGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                />
                <YAxis
                  yAxisId="left"
                  tickFormatter={(value) => `￥${Number(value || 0).toFixed(0)}`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(value) => `$${Number(value || 0).toFixed(0)}`}
                />
                <Tooltip
                  labelFormatter={(value) => {
                    const date = new Date(value as string);
                    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                  formatter={(value: any, name: any, props: any) => {
                    const dataKey = props?.dataKey as string | undefined;
                    if (dataKey === "cn") return [formatCurrency(Number(value || 0), "CNY"), name];
                    if (dataKey === "intl") return [formatCurrency(Number(value || 0), "USD"), name];
                    return [String(value ?? ""), name];
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="cn"
                  stroke="#ef4444"
                  strokeWidth={2}
                  yAxisId="left"
                  name="CN 收入 (￥)"
                />
                <Line
                  type="monotone"
                  dataKey="intl"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  yAxisId="right"
                  name="INTL 收入 ($)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
