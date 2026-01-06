import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering to avoid caching issues
export const dynamic = 'force-dynamic';

// Create Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Helper function to verify admin status
async function verifyAdmin(token: string): Promise<{ isAdmin: boolean; userId?: string; role?: string }> {
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return { isAdmin: false };
    }

    // Check if user is in admin_roles table
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

    return { isAdmin: true, userId: user.id, role: adminRole.role };
  } catch (err) {
    return { isAdmin: false };
  }
}

// GET - Check if current user is admin
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        success: true,
        isAdmin: false
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return NextResponse.json({
        success: true,
        isAdmin: false
      });
    }

    const result = await verifyAdmin(token);

    return NextResponse.json({
      success: true,
      isAdmin: result.isAdmin,
      userId: result.userId,
      role: result.role
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, isAdmin: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
