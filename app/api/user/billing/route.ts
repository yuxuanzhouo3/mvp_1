/**
 * 用户账单 API
 * User Billing API
 * 
 * 支持双环境:
 * - CN 环境: 腾讯云 Cloudbase
 * - INTL 环境: Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDbClient, getServiceDbClient, isChinaDeployment } from '@/lib/db-client';
import { getUserPaymentHistory } from '@/lib/payment/payments';

export async function GET(request: NextRequest) {
  try {
    const db = await getDbClient();
    
    // Get current user
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get URL parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Use service client for data operations
    const serviceDb = await getServiceDbClient();

    // Get user's current balance
    const { data: profile, error: profileError } = await serviceDb
      .from('user_profiles')
      .select('credits')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Failed to get user profile:', profileError);
    }

    // Get payment history
    const payments = await getUserPaymentHistory(user.id, limit, offset);

    // Get transaction history
    const { data: transactions, error: transactionError } = await serviceDb
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (transactionError) {
      console.error('Failed to get transactions:', transactionError);
    }

    return NextResponse.json({
      balance: profile?.credits || 0,
      records: payments.map(payment => ({
        id: payment.id,
        type: 'payment',
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        paymentMethod: payment.payment_method,
        description: payment.description,
        createdAt: payment.created_at,
        metadata: payment.metadata,
      })),
      transactions: transactions || [],
      pagination: {
        limit,
        offset,
        hasMore: payments.length === limit,
      },
    });
  } catch (error) {
    console.error('Billing API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
