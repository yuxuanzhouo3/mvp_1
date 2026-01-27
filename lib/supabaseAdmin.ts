/**
 * Supabase Admin Client
 * 用于服务端操作,绕过 RLS
 */

import { createClient } from "@supabase/supabase-js";
import { getSupabaseUrl, isPlaceholderSupabaseUrl } from "@/lib/config/supabase-env";

const supabaseUrl = getSupabaseUrl();
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin =
  supabaseUrl && supabaseServiceKey && !isPlaceholderSupabaseUrl(supabaseUrl)
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;
