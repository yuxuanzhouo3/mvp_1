/**
 * 个人资料设置 API
 * Profile Setup API
 * 
 * 支持双环境:
 * - CN 环境: 腾讯云 Cloudbase
 * - INTL 环境: Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceDbClient, isChinaDeployment } from '@/lib/db-client';
import { createClient } from '@supabase/supabase-js';
import {
  calculateMarketValue,
  transformUserToScoringData,
  type MarketValueScore
} from '@/lib/scoring';
import type { GenderEnum } from '@/types/database';

// INTL 环境: 创建用于认证的 Supabase 客户端
function createSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

// 从请求中验证用户身份
async function authenticateUser(request: NextRequest): Promise<{ userId: string; email?: string } | null> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];

  if (isChinaDeployment()) {
    // CN 环境: 支持 cn_ 前缀的用户 ID token
    if (token.startsWith('cn_')) {
      const userId = token.substring(3); // 移除 'cn_' 前缀
      if (userId) {
        return { userId };
      }
    }

    // 尝试从 Cloudbase 验证 token
    try {
      const db = await getServiceDbClient();
      const { data, error } = await db.auth.getUser();
      if (error || !data?.user) {
        try {
          const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
          return {
            userId: payload.sub || payload.uid,
            email: payload.email
          };
        } catch {
          return null;
        }
      }
      return {
        userId: data.user.id,
        email: data.user.email
      };
    } catch {
      return null;
    }
  } else {
    // INTL 环境: 使用 Supabase 验证 token
    try {
      const supabase = createSupabaseAdmin();
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        return null;
      }

      return {
        userId: user.id,
        email: user.email
      };
    } catch {
      return null;
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await authenticateUser(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = await getServiceDbClient();

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
    } = body;

    // Check if this is a new user (first time profile setup)
    const { data: existingProfile } = await db
      .from('user_profiles')
      .select('is_profile_complete, credits')
      .eq('user_id', authUser.userId)
      .single();

    const isNewUser = !existingProfile || !existingProfile.is_profile_complete;

    // Update users table
    const { error: userError } = await db
      .from('users')
      .upsert({
        id: authUser.userId,
        email: authUser.email,
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
      if (userError.message?.includes('username') || userError.code === '23505') {
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

    // Prepare location data
    let locationValue = null;
    if (latitude && longitude) {
      if (isChinaDeployment()) {
        // CN 环境: 存储为对象
        locationValue = { latitude, longitude };
      } else {
        // INTL 环境: PostGIS POINT format
        locationValue = `POINT(${longitude} ${latitude})`;
      }
    }

    // Update user_profiles table
    const { error: profileError } = await db
      .from('user_profiles')
      .upsert({
        user_id: authUser.userId,
        // CN 环境需要在 user_profiles 中存储 gender 和 birth_date（因为没有视图联合查询）
        gender,
        birth_date,
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

    // Give 100 free credits to new users
    if (isNewUser) {
      const { error: creditsError } = await db
        .from('user_profiles')
        .update({ credits: 100 })
        .eq('user_id', authUser.userId);

      if (creditsError) {
        console.error('Error adding welcome credits:', creditsError);
      } else {
        console.log('🎁 Added 100 welcome credits for new user:', authUser.userId);

        // Record the transaction
        await db
          .from('transactions')
          .insert({
            user_id: authUser.userId,
            type: 'credit_add_welcome',
            amount: 100,
            balance_after: 100,
            description: '新用户注册赠送积分',
          });
      }
    }

    // Handle interests
    if (interest_ids && interest_ids.length > 0) {
      // First, delete existing interests
      await db
        .from('users_interests_map')
        .delete()
        .eq('user_id', authUser.userId);

      // Then insert new interests
      const interestRecords = interest_ids.map((interestId: number) => ({
        user_id: authUser.userId,
        interest_id: interestId,
      }));

      const { error: interestError } = await db
        .from('users_interests_map')
        .insert(interestRecords);

      if (interestError) {
        console.error('Error updating interests:', interestError);
      }
    }

    // Calculate Market Value Score
    try {
      console.log('📊 Calculating market value score for user:', authUser.userId);

      // Fetch user photos for scoring
      const { data: photosData } = await db
        .from('user_photos')
        .select('*')
        .eq('user_id', authUser.userId)
        .eq('audit_status', 'approved')
        .order('sort_order', { ascending: true });

      // Prepare location for scoring
      let locationForScoring: { latitude: number; longitude: number } | null = null;
      if (latitude && longitude) {
        locationForScoring = { latitude, longitude };
      }

      // Calculate BMI if height and weight are provided
      let calculatedBmi: number | null = null;
      if (height_cm && weight_kg) {
        const heightInMeters = height_cm / 100;
        calculatedBmi = weight_kg / (heightInMeters * heightInMeters);
      }

      // Transform user data to scoring format
      const scoringData = transformUserToScoringData(
        {
          gender: (gender as GenderEnum) || null,
          birth_date: birth_date || null
        },
        {
          bmi: calculatedBmi,
          education_level: education_level || null,
          company_type: company_type || null,
          annual_income_range: annual_income_range || null,
          marital_status: marital_status || 'single',
          relationship_history_count: relationship_history_count || 0,
          children_preference: children_preference || null,
          mbti: mbti || null,
          location: locationForScoring
        },
        photosData || []
      );

      // Calculate market value
      const evaluatorGender: GenderEnum = gender === 'male' ? 'female' : 'male';
      const result = calculateMarketValue(
        scoringData,
        evaluatorGender,
        'compatible_match',
        null
      );

      // Calculate percentile
      const { data: sameGenderUsers } = await db
        .from('users')
        .select('id')
        .eq('gender', gender);

      let percentile = 50;
      if (sameGenderUsers && sameGenderUsers.length > 0) {
        // Simplified percentile calculation
        const totalCount = sameGenderUsers.length;
        percentile = Math.min(95, Math.max(5, Math.round(50 + (result.totalScore - 60) * 2)));
      }

      const fullScore: MarketValueScore = {
        ...result,
        percentile
      };

      // Save market value score to database
      const { error: scoreError } = await db
        .from('user_profiles')
        .update({
          market_value_score: fullScore
        })
        .eq('user_id', authUser.userId);

      if (scoreError) {
        console.error('Error saving market value score:', scoreError);
      } else {
        console.log('✅ Market value score calculated and saved:', fullScore.totalScore);
      }
    } catch (scoreCalcError) {
      console.error('Error calculating market value score:', scoreCalcError);
    }

    return NextResponse.json({
      success: true,
      message: 'Profile setup completed successfully',
      data: {
        user_id: authUser.userId,
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
    const authUser = await authenticateUser(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = await getServiceDbClient();

    // Fetch user data
    const { data: userData, error: userError } = await db
      .from('users')
      .select('*')
      .eq('id', authUser.userId)
      .single();

    // Fetch profile data
    const { data: profileData, error: profileError } = await db
      .from('user_profiles')
      .select('*')
      .eq('user_id', authUser.userId)
      .single();

    // Fetch interests
    const { data: interestsData } = await db
      .from('users_interests_map')
      .select('interest_id')
      .eq('user_id', authUser.userId);

    // Fetch photos
    const { data: photosData } = await db
      .from('user_photos')
      .select('*')
      .eq('user_id', authUser.userId)
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
