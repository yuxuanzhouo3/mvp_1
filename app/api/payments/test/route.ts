import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({
        status: 'error',
        message: 'Not authenticated',
        error: authError?.message
      });
    }

    // Test database connection
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits, full_name')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json({
        status: 'error',
        message: 'Database connection failed',
        error: profileError.message
      });
    }

    return NextResponse.json({
      status: 'success',
      message: 'Payment system is working',
      user: {
        id: user.id,
        email: user.email,
        name: profile?.full_name,
        currentCredits: profile?.credits
      },
      paymentMethods: ['stripe', 'usdt', 'alipay'],
      packages: [
        { id: 'starter', credits: 50, price: 9.99 },
        { id: 'popular', credits: 150, price: 24.99 },
        { id: 'premium', credits: 300, price: 44.99 },
        { id: 'ultimate', credits: 500, price: 69.99 }
      ]
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 