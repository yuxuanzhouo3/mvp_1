import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with service role key for server-side operations
// This bypasses RLS and allows the API to access data on behalf of authenticated users
function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Supabase configuration missing');
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Create a Supabase client with anon key for token verification only
function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Supabase configuration missing');
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    // Extract the token
    const token = authHeader.replace('Bearer ', '');

    // Create clients
    let anonClient;
    let serviceClient;
    try {
      anonClient = createAnonClient();
      serviceClient = createServiceClient();
    } catch (err) {
      return NextResponse.json({ error: 'Supabase configuration error', details: String(err) }, { status: 500 });
    }

    // Verify the token and get user using anon client
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Step 1: Check if user exists in users table (use serviceClient to bypass RLS)
    let { data: userData, error: userError } = await serviceClient
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    // If user doesn't exist (PGRST116 = not found), create one
    if (userError?.code === 'PGRST116' || !userData) {
      const { data: newUser, error: insertUserError } = await serviceClient
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          username: user.email?.split('@')[0],
          avatar_url: user.user_metadata?.avatar_url,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertUserError) {
        // Return a minimal profile if we can't create the user record
        return NextResponse.json({
          profile: {
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'User',
            avatar_url: user.user_metadata?.avatar_url,
            credits: 100,
            interests: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        });
      }
      userData = newUser;
    } else if (userError) {
      return NextResponse.json({ error: 'Failed to load user' }, { status: 500 });
    }

    // Step 2: Check if profile exists
    let { data: profileData, error: profileError } = await serviceClient
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // If profile doesn't exist, create one
    if (profileError?.code === 'PGRST116' || !profileData) {
      const { data: newProfile, error: insertProfileError } = await serviceClient
        .from('user_profiles')
        .insert({
          user_id: user.id,
          real_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertProfileError) {
        // Continue without profile data
      } else {
        profileData = newProfile;
      }
    }

    // Step 3: Get user interests (this won't fail if table is empty)
    const { data: interestsData } = await serviceClient
      .from('users_interests_map')
      .select('interest_id, interests(id, name, category, icon_url)')
      .eq('user_id', user.id);

    // Combine data into unified profile response
    const profile = {
      id: user.id,
      email: userData?.email || user.email,
      full_name: profileData?.real_name || user.user_metadata?.full_name || user.user_metadata?.name || 'User',
      avatar_url: userData?.avatar_url || user.user_metadata?.avatar_url,
      username: userData?.username,
      gender: userData?.gender,
      birth_date: userData?.birth_date,
      bio: profileData?.bio || '',
      location: profileData?.city_name || '',
      height_cm: profileData?.height_cm,
      weight_kg: profileData?.weight_kg,
      education_level: profileData?.education_level,
      occupation: profileData?.occupation,
      company_type: profileData?.company_type,
      annual_income_range: profileData?.annual_income_range,
      marital_status: profileData?.marital_status,
      relationship_history_count: profileData?.relationship_history_count,
      children_preference: profileData?.children_preference,
      mbti: profileData?.mbti,
      interests: interestsData?.map(i => (i.interests as any)?.name).filter(Boolean) || [],
      credits: 100,
      created_at: userData?.created_at || new Date().toISOString(),
      updated_at: profileData?.updated_at || userData?.updated_at || new Date().toISOString()
    };

    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
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

    // Create clients
    const anonClient = createAnonClient();
    const serviceClient = createServiceClient();

    // Verify the token and get user
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();

    // Separate user data and profile data
    const userData: Record<string, any> = {};
    const profileData: Record<string, any> = {};

    // Map fields to appropriate tables
    if (body.email !== undefined) userData.email = body.email;
    if (body.username !== undefined) userData.username = body.username;
    if (body.gender !== undefined) userData.gender = body.gender;
    if (body.birth_date !== undefined) userData.birth_date = body.birth_date;
    if (body.avatar_url !== undefined) userData.avatar_url = body.avatar_url;

    if (body.full_name !== undefined) profileData.real_name = body.full_name;
    if (body.bio !== undefined) profileData.bio = body.bio;
    if (body.location !== undefined) profileData.city_name = body.location;
    if (body.height_cm !== undefined) profileData.height_cm = body.height_cm;
    if (body.weight_kg !== undefined) profileData.weight_kg = body.weight_kg;
    if (body.education_level !== undefined) profileData.education_level = body.education_level;
    if (body.occupation !== undefined) profileData.occupation = body.occupation;
    if (body.company_type !== undefined) profileData.company_type = body.company_type;
    if (body.annual_income_range !== undefined) profileData.annual_income_range = body.annual_income_range;
    if (body.marital_status !== undefined) profileData.marital_status = body.marital_status;
    if (body.relationship_history_count !== undefined) profileData.relationship_history_count = body.relationship_history_count;
    if (body.children_preference !== undefined) profileData.children_preference = body.children_preference;
    if (body.mbti !== undefined) profileData.mbti = body.mbti;

    // Update users table if there's user data
    if (Object.keys(userData).length > 0) {
      userData.updated_at = new Date().toISOString();
      const { error: userUpdateError } = await serviceClient
        .from('users')
        .update(userData)
        .eq('id', user.id);

      if (userUpdateError) {
        // Log silently, don't fail the request
      }
    }

    // Update user_profiles table if there's profile data
    if (Object.keys(profileData).length > 0) {
      profileData.updated_at = new Date().toISOString();

      // Check if profile exists
      const { data: existingProfile } = await serviceClient
        .from('user_profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .single();

      if (existingProfile) {
        const { error: profileUpdateError } = await serviceClient
          .from('user_profiles')
          .update(profileData)
          .eq('user_id', user.id);

        if (profileUpdateError) {
          return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
        }
      } else {
        const { error: profileInsertError } = await serviceClient
          .from('user_profiles')
          .insert({
            user_id: user.id,
            ...profileData
          });

        if (profileInsertError) {
          return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
        }
      }
    }

    // Return updated profile data
    const { data: updatedUser } = await serviceClient
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    const { data: updatedProfile } = await serviceClient
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const profile = {
      id: user.id,
      email: updatedUser?.email || user.email,
      full_name: updatedProfile?.real_name || '',
      avatar_url: updatedUser?.avatar_url,
      username: updatedUser?.username,
      gender: updatedUser?.gender,
      birth_date: updatedUser?.birth_date,
      bio: updatedProfile?.bio || '',
      location: updatedProfile?.city_name || '',
      height_cm: updatedProfile?.height_cm,
      weight_kg: updatedProfile?.weight_kg,
      education_level: updatedProfile?.education_level,
      occupation: updatedProfile?.occupation,
      company_type: updatedProfile?.company_type,
      annual_income_range: updatedProfile?.annual_income_range,
      marital_status: updatedProfile?.marital_status,
      relationship_history_count: updatedProfile?.relationship_history_count,
      children_preference: updatedProfile?.children_preference,
      mbti: updatedProfile?.mbti,
      credits: 100,
      created_at: updatedUser?.created_at,
      updated_at: updatedProfile?.updated_at || updatedUser?.updated_at
    };

    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
