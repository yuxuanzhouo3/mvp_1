/**
 * 支付统计 API (管理员)
 * Payment Stats API (Admin)
 * 
 * 支持双环境:
 * - CN 环境: 腾讯云 Cloudbase
 * - INTL 环境: Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceDbClient, isChinaDeployment } from '@/lib/db-client';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering to avoid caching issues
export const dynamic = 'force-dynamic';

// INTL 环境
function createSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

async function verifyAdmin(token: string): Promise<{ isAdmin: boolean; userId?: string }> {
  try {
    let userId: string | undefined;

    if (isChinaDeployment()) {
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        userId = payload.sub || payload.uid;
      } catch {
        const db = await getServiceDbClient();
        const { data, error } = await db.auth.getUser();
        if (error || !data?.user) return { isAdmin: false };
        userId = data.user.id;
      }
    } else {
      const supabase = createSupabaseAdmin();
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) return { isAdmin: false };
      userId = user.id;
    }

    if (!userId) return { isAdmin: false };

    const db = await getServiceDbClient();
    const { data: adminRoles } = await db
      .from('admin_roles')
      .select('role')
      .eq('user_id', userId)
      .limit(1);

    return adminRoles && adminRoles.length > 0 ? { isAdmin: true, userId } : { isAdmin: false };
  } catch {
    return { isAdmin: false };
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { isAdmin } = await verifyAdmin(token);

    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const db = await getServiceDbClient();

    // Get all payments
    const { data: payments, error: paymentsError } = await db
      .from('payments')
      .select('id, user_id, amount, currency, credits, payment_method, status, metadata, created_at, completed_at');

    if (paymentsError) {
      return NextResponse.json({ success: false, error: 'Failed to fetch payments' }, { status: 500 });
    }

    const allPayments = payments || [];
    const completedPayments = allPayments.filter((p: any) => p.status === 'completed');
    const failedPayments = allPayments.filter((p: any) => p.status === 'failed');
    const pendingPayments = allPayments.filter((p: any) => p.status === 'pending');

    // Calculate success rate
    const totalAttempts = completedPayments.length + failedPayments.length;
    const successRate = totalAttempts > 0 ? (completedPayments.length / totalAttempts) * 100 : 0;

    // Calculate total revenue by currency
    const revenueByCurrency: Record<string, number> = {};
    completedPayments.forEach((p: any) => {
      const currency = p.currency || 'CNY';
      revenueByCurrency[currency] = (revenueByCurrency[currency] || 0) + parseFloat(p.amount);
    });

    // Get daily revenue for the past 30 days
    const dailyRevenue: Array<{ date: string; amount_cny: number; amount_usd: number; count: number }> = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayPayments = completedPayments.filter((p: any) => {
        const paymentDate = (p.completed_at || p.created_at).split('T')[0];
        return paymentDate === dateStr;
      });

      let amountCny = 0;
      let amountUsd = 0;
      dayPayments.forEach((p: any) => {
        const amount = parseFloat(p.amount);
        if (p.currency === 'USD') {
          amountUsd += amount;
        } else {
          amountCny += amount;
        }
      });

      dailyRevenue.push({
        date: dateStr,
        amount_cny: amountCny,
        amount_usd: amountUsd,
        count: dayPayments.length,
      });
    }

    // Get monthly revenue for the past 12 months
    const monthlyRevenue: Array<{ month: string; amount_cny: number; amount_usd: number; count: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      const monthPayments = completedPayments.filter((p: any) => {
        const paymentDate = new Date(p.completed_at || p.created_at);
        const paymentMonth = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;
        return paymentMonth === monthStr;
      });

      let amountCny = 0;
      let amountUsd = 0;
      monthPayments.forEach((p: any) => {
        const amount = parseFloat(p.amount);
        if (p.currency === 'USD') {
          amountUsd += amount;
        } else {
          amountCny += amount;
        }
      });

      monthlyRevenue.push({
        month: monthStr,
        amount_cny: amountCny,
        amount_usd: amountUsd,
        count: monthPayments.length,
      });
    }

    // Get package sales stats
    const packageSales: Record<string, { count: number; revenue_cny: number; revenue_usd: number }> = {};
    completedPayments.forEach((p: any) => {
      const packageId = p.metadata?.package_id || 'unknown';
      if (!packageSales[packageId]) {
        packageSales[packageId] = { count: 0, revenue_cny: 0, revenue_usd: 0 };
      }
      packageSales[packageId].count++;
      const amount = parseFloat(p.amount);
      if (p.currency === 'USD') {
        packageSales[packageId].revenue_usd += amount;
      } else {
        packageSales[packageId].revenue_cny += amount;
      }
    });

    // Get package names
    const { data: packages } = await db
      .from('credit_packages')
      .select('id, name_en, name_zh, credits');

    const packageStats = Object.entries(packageSales).map(([id, stats]) => {
      const pkg = packages?.find((p: any) => p.id === id);
      return {
        package_id: id,
        package_name: pkg?.name_zh || pkg?.name_en || id,
        credits: pkg?.credits || 0,
        ...stats,
      };
    }).sort((a, b) => b.count - a.count);

    // Payment method distribution
    const paymentMethodStats: Record<string, { count: number; revenue_cny: number; revenue_usd: number }> = {};
    completedPayments.forEach((p: any) => {
      const method = p.payment_method;
      if (!paymentMethodStats[method]) {
        paymentMethodStats[method] = { count: 0, revenue_cny: 0, revenue_usd: 0 };
      }
      paymentMethodStats[method].count++;
      const amount = parseFloat(p.amount);
      if (p.currency === 'USD') {
        paymentMethodStats[method].revenue_usd += amount;
      } else {
        paymentMethodStats[method].revenue_cny += amount;
      }
    });

    // Total stats
    const totalRevenueCny = revenueByCurrency['CNY'] || 0;
    const totalRevenueUsd = revenueByCurrency['USD'] || 0;
    const totalCreditsIssued = completedPayments.reduce((sum: number, p: any) => sum + (p.credits || 0), 0);

    return NextResponse.json({
      success: true,
      overview: {
        total_payments: completedPayments.length,
        total_revenue_cny: totalRevenueCny,
        total_revenue_usd: totalRevenueUsd,
        total_credits_issued: totalCreditsIssued,
        pending_payments: pendingPayments.length,
        failed_payments: failedPayments.length,
        success_rate: successRate,
      },
      daily_revenue: dailyRevenue,
      monthly_revenue: monthlyRevenue,
      package_stats: packageStats,
      payment_method_stats: Object.entries(paymentMethodStats).map(([method, stats]) => ({
        method,
        ...stats,
      })),
    });

  } catch (error) {
    console.error('Payment stats error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
