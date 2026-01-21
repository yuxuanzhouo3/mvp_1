import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { getDbClient, isChinaDeployment } from '@/lib/db-client';

function getCnUserId(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring('Bearer '.length);
    if (token.startsWith('cn_')) {
      const userId = token.substring(3);
      return userId || null;
    }
  }

  const cnSession =
    request.cookies.get('cn_session')?.value || request.cookies.get('cn_session_cross')?.value;
  return cnSession || null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  try {
    const { paymentId } = params;

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Missing payment ID' },
        { status: 400 }
      );
    }

    if (isChinaDeployment()) {
      const userId = getCnUserId(request);
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const db = await getDbClient();
      const { data: payment, error: paymentError } = await db
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .eq('user_id', userId)
        .single();

      if (paymentError || !payment) {
        return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
      }

      return NextResponse.json({
        id: payment.id,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        paymentMethod: payment.method || payment.payment_method,
        metadata: payment.metadata,
        createdAt: payment.created_at,
        updatedAt: payment.updated_at,
      });
    }

    const supabase = createSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .eq('user_id', user.id)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: payment.id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      paymentMethod: payment.payment_method,
      metadata: payment.metadata,
      createdAt: payment.created_at,
      updatedAt: payment.updated_at,
    });
  } catch (error) {
    console.error('Payment status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
