import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const isMockMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  return NextResponse.json({ 
    isMockMode,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'not set',
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'set' : 'not set'
  });
} 