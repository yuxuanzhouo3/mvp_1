import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];

    // Verify user token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      // Step 1
      username,
      gender,
      birth_date,
      city_name,
      latitude,
      longitude,
      // Step 2
      height_cm,
      weight_kg,
      // Step 3
      education_level,
      occupation,
      company_type,
      annual_income_range,
      // Step 4
      marital_status,
      relationship_history_count,
      children_preference,
      // Step 5
      mbti,
      interest_ids,
      bio,
      // Step 6 - photos handled separately
    } = body;

    // Update users table
    const { error: userError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: user.id,
        email: user.email,
        username,
        gender,
        birth_date,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id'
      });

    if (userError) {
      console.error('Error updating users table:', userError);
      // Check for unique constraint violation on username
      if (userError.code === '23505' && userError.message?.includes('username')) {
        return NextResponse.json(
          { success: false, error: 'Username already taken. Please choose a different username.' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { success: false, error: 'Failed to update user' },
        { status: 500 }
      );
    }

    // Prepare location data for PostGIS
    let locationValue = null;
    if (latitude && longitude) {
      // PostGIS POINT format: POINT(longitude latitude)
      locationValue = `POINT(${longitude} ${latitude})`;
    }

    // Update user_profiles table
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        user_id: user.id,
        height_cm,
        weight_kg,
        education_level,
        occupation,
        company_type,
        annual_income_range,
        marital_status: marital_status || 'single',
        relationship_history_count: relationship_history_count || 0,
        children_preference,
        mbti,
        bio,
        location: locationValue,
        city_name,
        is_profile_complete: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (profileError) {
      console.error('Error updating user_profiles table:', profileError);
      return NextResponse.json(
        { success: false, error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    // Handle interests
    if (interest_ids && interest_ids.length > 0) {
      // First, delete existing interests
      await supabaseAdmin
        .from('users_interests_map')
        .delete()
        .eq('user_id', user.id);

      // Then insert new interests
      const interestRecords = interest_ids.map((interestId: number) => ({
        user_id: user.id,
        interest_id: interestId,
      }));

      const { error: interestError } = await supabaseAdmin
        .from('users_interests_map')
        .insert(interestRecords);

      if (interestError) {
        console.error('Error updating interests:', interestError);
        // Don't fail the whole request for interest errors
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Profile setup completed successfully',
      data: {
        user_id: user.id,
      }
    });

  } catch (error) {
    console.error('Profile setup error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch current profile
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Fetch user data
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    // Fetch profile data
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Fetch interests
    const { data: interestsData } = await supabaseAdmin
      .from('users_interests_map')
      .select('interest_id')
      .eq('user_id', user.id);

    // Fetch photos
    const { data: photosData } = await supabaseAdmin
      .from('user_photos')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true });

    // Calculate completion status
    const completion = calculateCompletionStatus(userData, profileData, interestsData, photosData);

    return NextResponse.json({
      success: true,
      data: {
        user: userData,
        profile: profileData,
        interests: interestsData?.map(i => i.interest_id) || [],
        photos: photosData || [],
        completion,
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function calculateCompletionStatus(
  userData: any,
  profileData: any,
  interestsData: any[] | null,
  photosData: any[] | null
) {
  const step1_completed = !!(
    userData?.username &&
    userData?.gender &&
    userData?.birth_date &&
    profileData?.city_name
  );

  const step2_completed = !!(
    profileData?.height_cm &&
    profileData?.weight_kg
  );

  const step3_completed = !!(
    profileData?.education_level &&
    profileData?.occupation &&
    profileData?.company_type &&
    profileData?.annual_income_range
  );

  const step4_completed = !!(
    profileData?.marital_status &&
    profileData?.children_preference
  );

  const step5_completed = !!(
    interestsData && interestsData.length > 0
  );

  const step6_completed = !!(
    photosData && photosData.length > 0
  );

  const completedSteps = [
    step1_completed,
    step2_completed,
    step3_completed,
    step4_completed,
    step5_completed,
    step6_completed,
  ].filter(Boolean).length;

  return {
    step1_completed,
    step2_completed,
    step3_completed,
    step4_completed,
    step5_completed,
    step6_completed,
    overall_percentage: Math.round((completedSteps / 6) * 100),
  };
}

