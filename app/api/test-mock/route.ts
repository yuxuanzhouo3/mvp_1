import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAnonKey, getSupabaseUrl, isPlaceholderSupabaseUrl } from '@/lib/config/supabase-env';

export async function GET(request: NextRequest) {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  const isMockMode = !url || !key || isPlaceholderSupabaseUrl(url);
  
  return NextResponse.json({ 
    isMockMode,
    supabaseUrl: url || 'not set',
    supabaseKey: key ? 'set' : 'not set'
  });
} 
