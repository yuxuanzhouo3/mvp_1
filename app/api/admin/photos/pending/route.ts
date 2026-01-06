import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering to avoid caching issues
export const dynamic = 'force-dynamic';

// Create Supabase admin client
let supabaseAdmin: ReturnType<typeof createClient>;

try {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing required environment variables');
  }
  supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
} catch (err) {
  console.error('[admin/photos/pending] Failed to create Supabase client:', err);
  throw err;
}

// Helper function to verify admin status
async function verifyAdmin(token: string): Promise<{ isAdmin: boolean; userId?: string }> {
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return { isAdmin: false };
    }

    // Check if user is in admin_roles table - use maybeSingle() to avoid errors
    const { data: adminRole, error: adminError } = await supabaseAdmin
      .from('admin_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (adminError) {
      return { isAdmin: false };
    }

    if (!adminRole) {
      return { isAdmin: false };
    }

    return { isAdmin: true, userId: user.id };
  } catch (err) {
    return { isAdmin: false };
  }
}

// GET - List pending photos for review
export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const { isAdmin } = await verifyAdmin(token);

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    const status = searchParams.get('status') || 'pending';
    const userId = searchParams.get('userId');
    const unrated = searchParams.get('unrated') === 'true';

    // Validate pagination
    const validPage = Math.max(1, page);
    const validPageSize = Math.min(50, Math.max(1, pageSize));
    const offset = (validPage - 1) * validPageSize;

    // Build query
    let query = supabaseAdmin
      .from('user_photos')
      .select(`
        *,
        user:users!user_photos_user_id_fkey(id, username, email)
      `, { count: 'exact' })
      .eq('audit_status', status);

    // Filter for unrated photos (admin_rating is null) - used for rating approved photos
    // Only show primary photos for rating
    if (unrated) {
      query = query.is('admin_rating', null).eq('is_primary', true);
    }

    // Filter by user ID if provided
    if (userId) {
      query = query.eq('user_id', userId);
    }

    // Apply sorting
    query = query.order('created_at', { ascending: sortOrder === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + validPageSize - 1);

    const { data: photos, count, error } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch photos' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      photos: photos || [],
      total: count || 0,
      page: validPage,
      pageSize: validPageSize,
      totalPages: Math.ceil((count || 0) / validPageSize),
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
