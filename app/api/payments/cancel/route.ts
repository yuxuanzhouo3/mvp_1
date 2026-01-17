/**
 * 取消支付 API
 * Cancel Payment API
 * 
 * 支持双环境:
 * - CN 环境: 腾讯云 Cloudbase
 * - INTL 环境: Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceDbClient, isChinaDeployment } from '@/lib/db-client';
import { createClient } from '@supabase/supabase-js';

// INTL 环境
function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Supabase configuration missing');
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// 验证用户身份
async function authenticateUser(request: NextRequest): Promise<{ userId: string; email?: string } | null> {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');

  if (isChinaDeployment()) {
    // CN 环境
    try {
      const db = await getServiceDbClient();
      const { data, error } = await db.auth.getUser();
      if (error || !data?.user) {
        try {
          const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
          return {
            userId: payload.sub || payload.uid,
            email: payload.email
          };
        } catch {
          return null;
        }
      }
      return {
        userId: data.user.id,
        email: data.user.email
      };
    } catch {
      return null;
    }
  } else {
    // INTL 环境
    try {
      const anonClient = createAnonClient();
      const { data: { user }, error } = await anonClient.auth.getUser(token);
      
      if (error || !user) {
        return null;
      }
      
      return {
        userId: user.id,
        email: user.email
      };
    } catch {
      return null;
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await authenticateUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'No authorization header or invalid token' }, { status: 401 });
    }

    // Get payment ID from request body
    const body = await request.json();
    const { paymentId } = body;

    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
    }

    const db = await getServiceDbClient();

    // Get the payment record
    const { data: payment, error: fetchError } = await db
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .eq('user_id', authUser.userId)
      .single();

    if (fetchError || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Only allow canceling pending payments
    if (payment.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending payments can be cancelled' },
        { status: 400 }
      );
    }

    // Update payment status to cancelled
    const { error: updateError } = await db
      .from('payments')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentId)
      .eq('user_id', authUser.userId);

    if (updateError) {
      console.error('Failed to cancel payment:', updateError);
      return NextResponse.json({ error: 'Failed to cancel payment' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Payment cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel payment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
