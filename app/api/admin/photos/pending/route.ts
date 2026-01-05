import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Log environment variables status
console.log('[admin/photos/pending] Loading API route...');
console.log('[admin/photos/pending] NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET');
console.log('[admin/photos/pending] SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET');

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
  console.log('[admin/photos/pending] Supabase admin client created successfully');
} catch (err) {
  console.error('[admin/photos/pending] Failed to create Supabase client:', err);
  throw err;
}

// Helper function to verify admin status
async function verifyAdmin(token: string): Promise<{ isAdmin: boolean; userId?: string }> {
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      console.error('Auth error:', error);
      return { isAdmin: false };
    }

    console.log('Verifying admin for user:', user.id);

    // Check if user is in admin_roles table - use maybeSingle() to avoid errors
    const { data: adminRole, error: adminError } = await supabaseAdmin
      .from('admin_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (adminError) {
      console.error('Admin role query error:', adminError);
      return { isAdmin: false };
    }

    if (!adminRole) {
      console.log('No admin role found for user:', user.id);
      return { isAdmin: false };
    }

    console.log('Admin verified:', user.id, 'role:', adminRole.role);
    return { isAdmin: true, userId: user.id };
  } catch (err) {
    console.error('Verify admin exception:', err);
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
      console.error('Error fetching photos:', error);
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
    console.error('Get pending photos error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
