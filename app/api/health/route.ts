import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if we're in mock mode
    const isMockMode = process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://mock.supabase.co';
    
    if (isMockMode) {
      // In mock mode, return success without database check
      return NextResponse.json(
        { 
          status: 'ok',
          database: 'mock',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          environment: process.env.NODE_ENV,
          mode: 'mock'
        },
        { status: 200 }
      );
    }

    // Real database connection test
    const { supabase } = await import('@/lib/supabase/client');
    const { error } = await supabase.from('profiles').select('count').limit(1);
    
    const status = error ? 'degraded' : 'ok';
    const database = error ? 'disconnected' : 'connected';
    
    return NextResponse.json(
      { 
        status,
        database,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV,
        mode: 'real'
      },
      { status: error ? 503 : 200 }
    );
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      { 
        status: 'error',
        database: 'error',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        mode: 'error'
      },
      { status: 500 }
    );
  }
} 