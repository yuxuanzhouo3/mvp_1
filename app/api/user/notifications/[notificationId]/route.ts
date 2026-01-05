import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { markAsRead } from '@/lib/services/notifications';

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

// Helper to get user from token
async function getUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return user;
}

// PUT - Mark notification as read
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { notificationId } = await params;

    if (!notificationId) {
      return NextResponse.json(
        { success: false, error: 'Notification ID is required' },
        { status: 400 }
      );
    }

    const result = await markAsRead(notificationId, user.id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Mark as read error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
