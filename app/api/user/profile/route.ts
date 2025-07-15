import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Mock user profile data
const MOCK_PROFILE = {
  id: 'mock-user-id-123',
  email: 'test@personalink.ai',
  full_name: 'Test User',
  avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
  bio: 'I love meeting new people and having meaningful conversations!',
  location: 'San Francisco, CA',
  interests: ['Technology', 'Travel', 'Music', 'Reading', 'Cooking'],
  credits: 100,
  membership_level: 'free',
  is_verified: true,
  is_online: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export async function GET(request: NextRequest) {
  try {
    // Check if we're in mock mode (no Supabase config)
    const isMockMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (isMockMode) {
      // Return mock profile data
      return NextResponse.json({ profile: MOCK_PROFILE });
    }

    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error in user profile API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const updates = await request.json();
    
    // Check if we're in mock mode
    const isMockMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (isMockMode) {
      // Return updated mock profile
      const updatedProfile = { ...MOCK_PROFILE, ...updates, updated_at: new Date().toISOString() };
      return NextResponse.json({ profile: updatedProfile });
    }

    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Update user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single();

    if (profileError) {
      console.error('Error updating profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error in user profile API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 