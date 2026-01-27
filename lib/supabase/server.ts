import { createServerClient } from '@supabase/ssr';
import { createClient as createBasicClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getSupabaseAnonKey, getSupabaseServiceRoleKey, getSupabaseUrl, isPlaceholderSupabaseUrl } from '@/lib/config/supabase-env';

const supabaseUrl = getSupabaseUrl();
const supabaseKey = getSupabaseAnonKey();
const supabaseServiceKey = getSupabaseServiceRoleKey();

function assertSupabaseRouteConfig() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration missing. Ensure SUPABASE_URL and SUPABASE_ANON_KEY are set.');
  }
  if (isPlaceholderSupabaseUrl(supabaseUrl)) {
    throw new Error('Supabase URL is a placeholder. Ensure SUPABASE_URL is set to a real Supabase project URL.');
  }
}

export const createClient = () => {
  assertSupabaseRouteConfig();
  const cookieStore = cookies();
  return createServerClient(
    supabaseUrl!,
    supabaseKey!,
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
};

export const createRouteHandlerClient = () => {
  assertSupabaseRouteConfig();
  const cookieStore = cookies();
  return createServerClient(
    supabaseUrl!,
    supabaseKey!,
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
};

/**
 * Create a Supabase client with service role key for server-side operations
 * This bypasses RLS and should only be used for:
 * - Webhook handlers (Stripe, PayPal, etc.)
 * - Background jobs
 * - Admin operations
 * NEVER expose this client to the frontend
 */
export const createServiceClient = () => {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase service configuration missing. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
  }
  if (isPlaceholderSupabaseUrl(supabaseUrl)) {
    throw new Error('Supabase URL is a placeholder. Ensure SUPABASE_URL is set to a real Supabase project URL.');
  }

  return createBasicClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}; 
