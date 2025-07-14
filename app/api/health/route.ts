import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET() {
  try {
    // Test database connection
    const { error } = await supabase.from('profiles').select('count').limit(1);
    
    const status = error ? 'degraded' : 'ok';
    const database = error ? 'disconnected' : 'connected';
    
    return NextResponse.json(
      { 
        status,
        database,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV
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
        error: 'Health check failed'
      },
      { status: 500 }
    );
  }
} 