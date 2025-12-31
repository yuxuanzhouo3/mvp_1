import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    // Extract the token
    const token = authHeader.replace('Bearer ', '');
    
    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    console.log('🔍 Loading profile for user:', user.id);

    // Get user profile from profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.log('📝 Creating default profile for user:', user.id);
      // If profile doesn't exist, create a default one
      const defaultProfile = {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'User',
        avatar_url: user.user_metadata?.avatar_url,
        credits: 100, // Default credits
        bio: '',
        location: '',
        interests: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert(defaultProfile)
        .select()
        .single();

      if (insertError) {
        console.error('❌ Error creating profile:', insertError);
        return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
      }

      console.log('✅ Profile created:', newProfile);
      return NextResponse.json({ profile: newProfile });
    }

    console.log('✅ Profile loaded:', profile);
    return NextResponse.json({ profile });
  } catch (error) {
    console.error('❌ Profile API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    // Extract the token
    const token = authHeader.replace('Bearer ', '');
    
    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    console.log('📝 Updating profile for user:', user.id, 'with data:', body);

    // Update user profile
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating profile:', updateError);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    console.log('✅ Profile updated:', updatedProfile);
    return NextResponse.json({ profile: updatedProfile });
  } catch (error) {
    console.error('❌ Profile update API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 