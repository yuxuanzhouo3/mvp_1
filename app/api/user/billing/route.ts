import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserPaymentHistory } from '@/lib/payments';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
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

    // Get user's current balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Failed to get user profile:', profileError);
    }

    // Get payment history
    const payments = await getUserPaymentHistory(user.id, limit, offset);

    // Get transaction history
    const { data: transactions, error: transactionError } = await supabase
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