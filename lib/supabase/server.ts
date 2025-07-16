import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Check if we're in mock mode (for build/deployment without real Supabase)
const isMockMode = process.env.NODE_ENV === 'production' && 
  (!process.env.NEXT_PUBLIC_SUPABASE_URL || 
   process.env.NEXT_PUBLIC_SUPABASE_URL === 'your_supabase_url_here');

const supabaseUrl = isMockMode ? 'https://mock.supabase.co' : process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = isMockMode ? 'mock-key' : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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