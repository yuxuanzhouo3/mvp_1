import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import cloudbase from "@cloudbase/node-sdk";

/**
 * 获取数据统计信息 - 支持 CN 和 INTL 环境
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const toIsoDate = (d: Date) => d.toISOString().split("T")[0];

    const sumNumbers = (values: unknown[]): number =>
      values.reduce<number>((sum, v) => sum + (Number(v) || 0), 0);

    const pickBetter = <T extends { count?: number; sum?: number }>(
      a: T,
      b: T
    ) => {
      const aCount = a.count ?? 0;
      const bCount = b.count ?? 0;
      if (aCount === bCount) {
        const aSum = a.sum ?? 0;
        const bSum = b.sum ?? 0;
        return aSum >= bSum ? a : b;
      }
      return aCount > bCount ? a : b;
    };

    // 初始化腾讯云 Cloudbase
    let cnStats = {
      users: 0,
      todayUsers: 0,
      orders: 0,
      todayOrders: 0,
      revenueCny: 0,
      todayRevenueCny: 0,
      userGrowth: [] as Array<{ date: string; count: number }>,
    };

    // 获取 CN 环境数据（腾讯云）
    try {
      const app = cloudbase.init({
        env: process.env.CLOUDBASE_ENV_ID,
        secretId: process.env.CLOUDBASE_SECRET_ID,
        secretKey: process.env.CLOUDBASE_SECRET_KEY,
      });
      const db = app.database();
      const _ = db.command;

      const getCnCountForDay = async (collection: string, date: Date) => {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);

        const startMs = start.getTime();
        const endMs = end.getTime();
        const startIso = start.toISOString();
        const endIso = end.toISOString();

        const byCreatedAt = await db
          .collection(collection)
          .where({
            createdAt: _.gte(startMs).and(_.lt(endMs)),
          })
          .count()
          .then((r: any) => ({ count: r.total || 0 }))
          .catch(() => ({ count: 0 }));

        const byCreatedAtIso = await db
          .collection(collection)
          .where({
            created_at: _.gte(startIso).and(_.lt(endIso)),
          })
          .count()
          .then((r: any) => ({ count: r.total || 0 }))
          .catch(() => ({ count: 0 }));

        return pickBetter(byCreatedAt, byCreatedAtIso).count || 0;
      };

      const getCnPaymentsSumForDay = async (date: Date) => {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);

        const startMs = start.getTime();
        const endMs = end.getTime();
        const startIso = start.toISOString();
        const endIso = end.toISOString();

        const statusFilter = _.in(["success", "completed"]);

        const byCreatedAt = await db
          .collection("payments")
          .where({
            status: statusFilter,
            createdAt: _.gte(startMs).and(_.lt(endMs)),
          })
          .field({ amount: true })
          .get()
          .then((r: any) => ({
            count: Array.isArray(r.data) ? r.data.length : 0,
            sum: sumNumbers((r.data || []).map((x: any) => x?.amount)),
          }))
          .catch(() => ({ count: 0, sum: 0 }));

        const byCreatedAtIso = await db
          .collection("payments")
          .where({
            status: statusFilter,
            created_at: _.gte(startIso).and(_.lt(endIso)),
          })
          .field({ amount: true })
          .get()
          .then((r: any) => ({
            count: Array.isArray(r.data) ? r.data.length : 0,
            sum: sumNumbers((r.data || []).map((x: any) => x?.amount)),
          }))
          .catch(() => ({ count: 0, sum: 0 }));

        return pickBetter(byCreatedAt, byCreatedAtIso).sum || 0;
      };

      // CN 用户总数
      const usersResult = await db.collection("users").count();
      cnStats.users = usersResult.total || 0;

      // CN 今日新增用户
      cnStats.todayUsers = await getCnCountForDay("users", startOfToday);

      // CN 订单总数
      const ordersResult = await db.collection("payments").count();
      cnStats.orders = ordersResult.total || 0;

      // CN 今日订单数
      cnStats.todayOrders = await getCnCountForDay("payments", startOfToday);

      // CN 总收入（只统计成功的订单）
      const statusFilter = _.in(["success", "completed"]);
      const revenueResultByCreatedAt = await db
        .collection("payments")
        .where({ status: statusFilter })
        .field({ amount: true })
        .get()
        .then((r: any) => ({
          count: Array.isArray(r.data) ? r.data.length : 0,
          sum: sumNumbers((r.data || []).map((x: any) => x?.amount)),
        }))
        .catch(() => ({ count: 0, sum: 0 }));
      cnStats.revenueCny = revenueResultByCreatedAt.sum || 0;

      // CN 今日收入
      cnStats.todayRevenueCny = await getCnPaymentsSumForDay(startOfToday);

      // CN 最近7天用户增长
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);

        cnStats.userGrowth.push({
          date: toIsoDate(date),
          count: await getCnCountForDay("users", date),
        });
      }
    } catch (error) {
      console.error("获取 CN 环境数据失败:", error);
    }

    // 获取 INTL 环境数据（Supabase）
    let intlStats = {
      users: 0,
      todayUsers: 0,
      orders: 0,
      todayOrders: 0,
      revenueUsd: 0,
      todayRevenueUsd: 0,
      userGrowth: [] as Array<{ date: string; count: number }>,
    };

    if (supabaseAdmin) {
      // INTL 用户总数
      const { count: totalUsers } = await supabaseAdmin
        .from("users")
        .select("id", { count: "exact", head: true });
      intlStats.users = totalUsers || 0;

      // INTL 今日新增用户
      const { count: todayUsers } = await supabaseAdmin
        .from("users")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startOfToday.toISOString());
      intlStats.todayUsers = todayUsers || 0;

      // INTL 订单总数
      const { count: totalOrders } = await supabaseAdmin
        .from("payments")
        .select("id", { count: "exact", head: true });
      intlStats.orders = totalOrders || 0;

      // INTL 今日订单数
      const { count: todayOrders } = await supabaseAdmin
        .from("payments")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startOfToday.toISOString());
      intlStats.todayOrders = todayOrders || 0;

      // INTL 总收入（只统计 completed 状态）
      const { data: revenueData } = await supabaseAdmin
        .from("payments")
        .select("amount")
        .eq("status", "completed");
      intlStats.revenueUsd = revenueData?.reduce(
        (sum, item: any) => sum + (parseFloat(item.amount) || 0),
        0
      ) || 0;

      // INTL 今日收入
      const { data: todayRevenueData } = await supabaseAdmin
        .from("payments")
        .select("amount")
        .eq("status", "completed")
        .gte("created_at", startOfToday.toISOString());
      intlStats.todayRevenueUsd = todayRevenueData?.reduce(
        (sum, item: any) => sum + (parseFloat(item.amount) || 0),
        0
      ) || 0;

      // INTL 最近7天用户增长
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const { count } = await supabaseAdmin
          .from("users")
          .select("id", { count: "exact", head: true })
          .gte("created_at", date.toISOString())
          .lt("created_at", nextDate.toISOString());

        intlStats.userGrowth.push({
          date: date.toISOString().split("T")[0],
          count: count || 0,
        });
      }
    }

    // 合并用户增长数据
    const combinedUserGrowth = cnStats.userGrowth.map((cnDay, index) => ({
      date: cnDay.date,
      cn: cnDay.count,
      intl: intlStats.userGrowth[index]?.count || 0,
      total: cnDay.count + (intlStats.userGrowth[index]?.count || 0),
    }));

    // 合并收入增长数据（最近7天）
    const revenueGrowth: Array<{ date: string; cn: number; intl: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      let cnRevenue = 0;
      let intlRevenue = 0;

      // CN 收入
      try {
        const app = cloudbase.init({
          env: process.env.CLOUDBASE_ENV_ID,
          secretId: process.env.CLOUDBASE_SECRET_ID,
          secretKey: process.env.CLOUDBASE_SECRET_KEY,
        });
        const db = app.database();
        const _ = db.command;

        const statusFilter = _.in(["success", "completed"]);
        const byCreatedAt = await db
          .collection("payments")
          .where({
            status: statusFilter,
            createdAt: _.gte(date.getTime()).and(_.lt(nextDate.getTime())),
          })
          .field({ amount: true })
          .get()
          .then((r: any) => ({
            count: Array.isArray(r.data) ? r.data.length : 0,
            sum: sumNumbers((r.data || []).map((x: any) => x?.amount)),
          }))
          .catch(() => ({ count: 0, sum: 0 }));

        const byCreatedAtIso = await db
          .collection("payments")
          .where({
            status: statusFilter,
            created_at: _.gte(date.toISOString()).and(_.lt(nextDate.toISOString())),
          })
          .field({ amount: true })
          .get()
          .then((r: any) => ({
            count: Array.isArray(r.data) ? r.data.length : 0,
            sum: sumNumbers((r.data || []).map((x: any) => x?.amount)),
          }))
          .catch(() => ({ count: 0, sum: 0 }));

        cnRevenue = pickBetter(byCreatedAt, byCreatedAtIso).sum || 0;
      } catch (error) {
        console.error("获取 CN 收入数据失败:", error);
      }

      // INTL 收入
      if (supabaseAdmin) {
        const { data } = await supabaseAdmin
          .from("payments")
          .select("amount")
          .eq("status", "completed")
          .gte("created_at", date.toISOString())
          .lt("created_at", nextDate.toISOString());
        intlRevenue =
          data?.reduce((sum, item: any) => sum + (parseFloat(item.amount) || 0), 0) || 0;
      }

      revenueGrowth.push({
        date: date.toISOString().split("T")[0],
        cn: cnRevenue,
        intl: intlRevenue,
      });
    }

    return NextResponse.json({
      cn: {
        totalUsers: cnStats.users,
        todayUsers: cnStats.todayUsers,
        totalOrders: cnStats.orders,
        todayOrders: cnStats.todayOrders,
        totalRevenueCny: cnStats.revenueCny,
        todayRevenueCny: cnStats.todayRevenueCny,
      },
      intl: {
        totalUsers: intlStats.users,
        todayUsers: intlStats.todayUsers,
        totalOrders: intlStats.orders,
        todayOrders: intlStats.todayOrders,
        totalRevenueUsd: intlStats.revenueUsd,
        todayRevenueUsd: intlStats.todayRevenueUsd,
      },
      total: {
        totalUsers: cnStats.users + intlStats.users,
        todayUsers: cnStats.todayUsers + intlStats.todayUsers,
        totalOrders: cnStats.orders + intlStats.orders,
        todayOrders: cnStats.todayOrders + intlStats.todayOrders,
        totalRevenueCny: cnStats.revenueCny,
        todayRevenueCny: cnStats.todayRevenueCny,
        totalRevenueUsd: intlStats.revenueUsd,
        todayRevenueUsd: intlStats.todayRevenueUsd,
      },
      userGrowth: combinedUserGrowth,
      revenueGrowth,
    });
  } catch (error) {
    console.error("获取统计数据失败:", error);
    return NextResponse.json(
      { error: "获取统计数据失败" },
      { status: 500 }
    );
  }
}
