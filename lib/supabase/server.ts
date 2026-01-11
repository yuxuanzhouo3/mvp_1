import { createServerClient } from '@supabase/ssr';
import { createClient as createBasicClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Check if we're in mock mode (for build/deployment without real Supabase)
const isMockMode = process.env.NODE_ENV === 'production' &&
  (!process.env.NEXT_PUBLIC_SUPABASE_URL ||
   process.env.NEXT_PUBLIC_SUPABASE_URL === 'your_supabase_url_here');

const supabaseUrl = isMockMode ? 'https://mock.supabase.co' : process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = isMockMode ? 'mock-key' : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const createClient = () => {
  const cookieStore = cookies();
  return createServerClient(
    supabaseUrl,
    supabaseKey,
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
  const cookieStore = cookies();
  return createServerClient(
    supabaseUrl,
    supabaseKey,
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
    throw new Error('Supabase service configuration missing. Ensure SUPABASE_SERVICE_ROLE_KEY is set.');
  }

  return createBasicClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}; 