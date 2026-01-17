import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// 延迟初始化 Admin client，避免构建时因缺少环境变量而失败
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error('Supabase configuration is missing');
  }
  
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  if (error) {
    console.error('OAuth error:', error, errorDescription);
    return NextResponse.redirect(
      `${requestUrl.origin}/auth/login?error=${encodeURIComponent(errorDescription || 'Authentication failed')}`
    );
  }

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('Session exchange error:', error);
        return NextResponse.redirect(
          `${requestUrl.origin}/auth/login?error=${encodeURIComponent('Failed to complete authentication')}`
        );
      }

      if (data.user) {
        // Check if user has completed profile setup
        const supabaseAdmin = getSupabaseAdmin();
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('user_profiles')
          .select('id, is_profile_complete')
          .eq('user_id', data.user.id)
          .single();

        if (profileError || !profile || !profile.is_profile_complete) {
          // New user or incomplete profile - redirect to profile setup
          console.log('📋 New user or incomplete profile, redirecting to profile setup');
          return NextResponse.redirect(`${requestUrl.origin}/profile/setup`);
        }

        // Existing user with complete profile - redirect to dashboard
        return NextResponse.redirect(`${requestUrl.origin}/dashboard`);
      }
    } catch (error) {
      console.error('OAuth callback error:', error);
      return NextResponse.redirect(
        `${requestUrl.origin}/auth/login?error=${encodeURIComponent('Authentication failed')}`
      );
    }
  }

  // Fallback redirect to login
  return NextResponse.redirect(`${requestUrl.origin}/auth/login`);
} 