export function getSupabaseUrl(): string | undefined {
  return process.env.SUPABASE_URL ?? process.env['NEXT_PUBLIC_SUPABASE_URL'];
}

export function getSupabaseAnonKey(): string | undefined {
  return process.env.SUPABASE_ANON_KEY ?? process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
}

export function getSupabaseServiceRoleKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function isPlaceholderSupabaseUrl(url: string | undefined): boolean {
  if (!url) return false;
  return url.includes('build-placeholder.supabase.co') || url.includes('your_supabase_url_here');
}
