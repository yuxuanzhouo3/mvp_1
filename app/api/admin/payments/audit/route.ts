import { NextRequest, NextResponse } from 'next/server';
import { getServiceDbClient, isChinaDeployment } from '@/lib/db-client';
import { createClient } from '@supabase/supabase-js';
import { listPaymentEvents } from '@/lib/observability/payment-events';

export const dynamic = 'force-dynamic';

function createSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
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

    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('paymentId') || searchParams.get('payment_id');
    const limit = Number(searchParams.get('limit') || '50');

    if (!paymentId) {
      return NextResponse.json({ success: false, error: 'Missing paymentId' }, { status: 400 });
    }

    const events = await listPaymentEvents({
      paymentId,
      limit: Number.isFinite(limit) ? Math.max(1, Math.min(200, limit)) : 50,
    });

    return NextResponse.json({
      success: true,
      paymentId,
      count: events.length,
      events,
      region: isChinaDeployment() ? 'CN' : 'INTL',
    });
  } catch (error) {
    console.error('Payment audit error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

