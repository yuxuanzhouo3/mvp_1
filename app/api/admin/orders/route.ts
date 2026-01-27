import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextRequest, NextResponse } from "next/server";
import cloudbase from "@cloudbase/node-sdk";
import { isChinaRequest } from "@/lib/config/request-region";

/**
 * 获取交易订单列表
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("pageSize") || "20"))
    );
    const status = searchParams.get("status") || "all";
    const requestedRegion = (searchParams.get("region") || "").toLowerCase();
    const region =
      requestedRegion === "cn" || requestedRegion === "intl" || requestedRegion === "all"
        ? requestedRegion
        : isChinaRequest(request)
          ? "cn"
          : "intl";

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const normalizeIntlOrder = (o: any) => ({
      id: o.id,
      region: "INTL",
      user_id: o.user_id,
      amount: typeof o.amount === "string" ? parseFloat(o.amount) : o.amount,
      currency: o.currency || "USD",
      status: o.status,
      payment_method: o.payment_method,
      created_at: o.created_at,
      completed_at: o.completed_at,
      users: o.users,
      metadata: o.metadata,
    });

    const fetchIntl = async (skip: number, take: number) => {
      if (!supabaseAdmin) {
        const missing: string[] = [];
        if (!(process.env.SUPABASE_URL ?? process.env["NEXT_PUBLIC_SUPABASE_URL"])) missing.push("SUPABASE_URL");
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
        return { ok: false as const, missing, total: 0, orders: [] as any[] };
      }

      let countQuery = supabaseAdmin
        .from("payments")
        .select("id", { count: "exact", head: true });
      if (status !== "all") countQuery = countQuery.eq("status", status);
      const { count, error: countError } = await countQuery;
      if (countError) {
        return {
          ok: false as const,
          error: countError.message || "获取 INTL 订单总数失败",
          total: 0,
          orders: [] as any[],
        };
      }

      const total = count || 0;
      const start = Math.max(0, skip);
      if (start >= total) return { ok: true as const, total, orders: [] as any[] };

      const target = Math.min(take, total - start);
      const chunkSize = 100;
      const collected: any[] = [];

      for (let offset = start; offset < start + target; offset += chunkSize) {
        const chunkTo = Math.min(start + target - 1, offset + chunkSize - 1);
        let query = supabaseAdmin
          .from("payments")
          .select(
            `
          id,
          user_id,
          amount,
          currency,
          status,
          payment_method,
          created_at,
          completed_at,
          metadata,
          users:user_id (
            username,
            email
          )
        `
          )
          .order("created_at", { ascending: false })
          .range(offset, chunkTo);

        if (status !== "all") query = query.eq("status", status);

        const { data, error } = await query;
        if (error) {
          return {
            ok: false as const,
            error: error.message || "获取 INTL 订单列表失败",
            total,
            orders: [] as any[],
          };
        }
        if (!data || data.length === 0) break;
        collected.push(...data);
      }

      return { ok: true as const, total, orders: collected.map(normalizeIntlOrder) };
    };

    const normalizeCnTime = (value: any): string | null => {
      if (typeof value === "number" && Number.isFinite(value)) {
        return new Date(value).toISOString();
      }
      if (typeof value === "string" && value) {
        const d = new Date(value);
        if (!Number.isNaN(d.getTime())) return d.toISOString();
      }
      return null;
    };

    const missingCloudbase: string[] = [];
    if (!process.env.CLOUDBASE_ENV_ID) missingCloudbase.push("CLOUDBASE_ENV_ID");
    if (!process.env.CLOUDBASE_SECRET_ID) missingCloudbase.push("CLOUDBASE_SECRET_ID");
    if (!process.env.CLOUDBASE_SECRET_KEY) missingCloudbase.push("CLOUDBASE_SECRET_KEY");
    const cloudbaseConfigured = missingCloudbase.length === 0;

    const normalizeCnPaymentMethod = (value: any): string => {
      if (typeof value === "string" && value) return value;
      return "unknown";
    };

    const normalizeCnStatus = (value: any): string => {
      if (typeof value === "string" && value) return value;
      return "unknown";
    };

    const normalizeCnOrder = (doc: any) => {
      const id = String(
        doc.id ||
          doc._id ||
          doc.paymentId ||
          doc.payment_id ||
          doc.out_trade_no ||
          doc.trade_no ||
          ""
      );
      const userId = String(doc.user_id || doc.userId || doc.uid || doc.user || "");
      const createdAt = normalizeCnTime(doc.createdAt) || normalizeCnTime(doc.created_at) || null;
      const completedAt =
        normalizeCnTime(doc.completedAt) || normalizeCnTime(doc.completed_at) || null;
      const paymentMethod = normalizeCnPaymentMethod(doc.payment_method || doc.method);
      return {
        id,
        region: "CN",
        user_id: userId,
        amount: Number(doc.amount) || 0,
        currency: doc.currency || "CNY",
        status: normalizeCnStatus(doc.status),
        payment_method: paymentMethod,
        created_at: createdAt,
        completed_at: completedAt,
        metadata: doc.metadata,
      };
    };

    const fetchCn = async (skip: number, take: number) => {
      if (!cloudbaseConfigured) {
        return { ok: false as const, missing: missingCloudbase, total: 0, orders: [] as any[] };
      }

      const app = cloudbase.init({
        env: process.env.CLOUDBASE_ENV_ID,
        secretId: process.env.CLOUDBASE_SECRET_ID,
        secretKey: process.env.CLOUDBASE_SECRET_KEY,
      });
      const db = app.database();
      const _ = db.command;

      const cnStatusFilter =
        status === "all"
          ? null
          : status === "completed"
            ? _.in(["completed", "success"])
            : status;

      const countWhere: any = {};
      if (cnStatusFilter) countWhere.status = cnStatusFilter;

      const countResult = await db
        .collection("payments")
        .where(countWhere)
        .count()
        .catch(() => ({ total: 0 }));
      const total = countResult?.total || 0;
      const start = Math.max(0, skip);
      if (start >= total) return { ok: true as const, total, orders: [] as any[] };

      const target = Math.min(take, total - start);
      const chunkSize = 100;

      const buildQuery = (orderField: "createdAt" | "created_at", skip: number, take: number) => {
        const where: any = {};
        if (cnStatusFilter) where.status = cnStatusFilter;
        return db
          .collection("payments")
          .where(where)
          .orderBy(orderField, "desc")
          .skip(skip)
          .limit(take)
          .get();
      };

      let orderField: "createdAt" | "created_at" = "createdAt";
      try {
        const probe = await buildQuery("createdAt", 0, 1);
        if ((!probe?.data || probe.data.length === 0) && total > 0) orderField = "created_at";
      } catch {
        orderField = "created_at";
      }

      const collected: any[] = [];
      for (let offset = start; offset < start + target; offset += chunkSize) {
        const chunkTake = Math.min(chunkSize, start + target - offset);
        let chunk: any = null;
        try {
          chunk = await buildQuery(orderField, offset, chunkTake);
        } catch (e: any) {
          return {
            ok: false as const,
            error: e?.message || "获取 CN 订单列表失败",
            total,
            orders: [] as any[],
          };
        }

        const data = chunk?.data || [];
        if (data.length === 0) break;
        collected.push(...data);
      }

      const normalized = collected.map((doc: any) => {
        const order = normalizeCnOrder(doc);
        const meta = doc?.metadata && typeof doc.metadata === "object" ? doc.metadata : null;
        const metaEmail = typeof meta?.userEmail === "string" ? meta.userEmail : "";
        return { order, metaEmail };
      });

      const uniq = (values: string[]) => Array.from(new Set(values.filter(Boolean)));
      const userIds = uniq(normalized.map((x) => String(x.order.user_id || "")));
      const emails = uniq(normalized.map((x) => String(x.metaEmail || ""))).map((e) =>
        e.toLowerCase()
      );

      const usersByKey = new Map<string, any>();
      const addUser = (u: any) => {
        if (!u) return;
        if (u._id) usersByKey.set(`_id:${String(u._id)}`, u);
        if (u.id) usersByKey.set(`id:${String(u.id)}`, u);
        if (u.email) usersByKey.set(`email:${String(u.email).toLowerCase()}`, u);
      };

      const chunkSizeIn = 50;
      const fetchUsersByField = async (field: "_id" | "id" | "email", values: string[]) => {
        for (let i = 0; i < values.length; i += chunkSizeIn) {
          const chunk = values.slice(i, i + chunkSizeIn);
          if (chunk.length === 0) continue;
          try {
            const where: any = {};
            where[field] = _.in(chunk);
            const res = await db.collection("users").where(where).get();
            const list = res?.data || [];
            for (const u of list) addUser(u);
          } catch {
          }
        }
      };

      await Promise.all([
        fetchUsersByField("_id", userIds),
        fetchUsersByField("id", userIds),
        fetchUsersByField("email", emails),
      ]);

      const orders = normalized.map(({ order, metaEmail }) => {
        const emailKey = metaEmail ? `email:${String(metaEmail).toLowerCase()}` : "";
        const user =
          (order.user_id ? usersByKey.get(`_id:${order.user_id}`) : null) ||
          (order.user_id ? usersByKey.get(`id:${order.user_id}`) : null) ||
          (emailKey ? usersByKey.get(emailKey) : null);

        const resolvedEmail =
          (user?.email && String(user.email)) || (metaEmail && String(metaEmail)) || "";
        const resolvedUsername =
          (user?.display_name && String(user.display_name)) ||
          (user?.username && String(user.username)) ||
          (user?.name && String(user.name)) ||
          (resolvedEmail ? resolvedEmail.split("@")[0] : "") ||
          "未知用户";

        return {
          ...order,
          users: {
            username: resolvedUsername,
            email: resolvedEmail || undefined,
          },
        };
      });

      return { ok: true as const, total, orders };
    };

    if (region === "all") {
      const [cn, intl] = await Promise.all([fetchCn(0, to + 1), fetchIntl(0, to + 1)]);

      const sources = {
        cn: cn.ok
          ? { ok: true as const, total: cn.total }
          : { ok: false as const, total: cn.total, missing: (cn as any).missing, error: (cn as any).error },
        intl: intl.ok
          ? { ok: true as const, total: intl.total }
          : {
              ok: false as const,
              total: intl.total,
              missing: (intl as any).missing,
              error: (intl as any).error,
            },
      };

      const ts = (value: any) => {
        const t = new Date(value || 0).getTime();
        return Number.isFinite(t) ? t : 0;
      };
      const merged = [...cn.orders, ...intl.orders].sort(
        (a: any, b: any) => ts(b.created_at) - ts(a.created_at)
      );
      const orders = merged.slice(from, from + pageSize);
      const total = (cn.total || 0) + (intl.total || 0);

      return NextResponse.json({
        region: "all",
        orders,
        total,
        page,
        pageSize,
        sources,
      });
    }

    if (region === "intl") {
      const result = await fetchIntl(from, pageSize);
      if (!result.ok) {
        if ((result as any).missing) {
          return NextResponse.json(
            { error: "INTL 数据源未配置", missing: (result as any).missing },
            { status: 503 }
          );
        }
        console.error("获取订单列表失败:", (result as any).error);
        return NextResponse.json({ error: "获取订单列表失败" }, { status: 500 });
      }

      return NextResponse.json({
        region: "intl",
        orders: result.orders,
        total: result.total,
        page,
        pageSize,
      });
    }

    const result = await fetchCn(from, pageSize);
    if (!result.ok) {
      if ((result as any).missing) {
        return NextResponse.json(
          { error: "CN 数据源未配置", missing: (result as any).missing },
          { status: 503 }
        );
      }
      console.error("获取订单列表失败:", (result as any).error);
      return NextResponse.json({ error: "获取订单列表失败" }, { status: 500 });
    }

    return NextResponse.json({
      region: "cn",
      orders: result.orders,
      total: result.total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("获取订单列表失败:", error);
    return NextResponse.json(
      { error: "获取订单列表失败" },
      { status: 500 }
    );
  }
}
