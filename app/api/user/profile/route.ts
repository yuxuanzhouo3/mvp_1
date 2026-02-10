/**
 * 用户资料 API
 * User Profile API
 * 
 * 支持双环境:
 * - CN 环境: 腾讯云 Cloudbase
 * - INTL 环境: Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDbClient, getServiceDbClient, isChinaDeployment } from '@/lib/db-client';
import { requireUser } from '@/lib/auth/requireUser';

export const dynamic = 'force-dynamic';

// 从请求中验证用户身份
async function authenticateUser(request: NextRequest): Promise<{ userId: string; email?: string; metadata?: any } | null> {
  try {
    const user = await requireUser(request);
    return { userId: user.userId, email: user.email, metadata: {} };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const authUser = await authenticateUser(request);
    
    if (!authUser) {
      return NextResponse.json({ error: 'No authorization header or invalid token' }, { status: 401 });
    }

    // 获取服务端数据库客户端 (绕过 RLS)
    const db = await getServiceDbClient();

    // Step 1: 检查用户是否存在
    let { data: userData, error: userError } = await db
      .from('users')
      .select('*')
      .eq('id', authUser.userId)
      .single();

    // 如果用户不存在，创建一个
    if (userError?.code === 'PGRST116' || !userData) {
      const { data: newUser, error: insertUserError } = await db
        .from('users')
        .insert({
          id: authUser.userId,
          email: authUser.email,
          username: authUser.email?.split('@')[0],
          avatar_url: authUser.metadata?.avatar_url,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertUserError) {
        // 如果无法创建用户记录，返回最小化的 profile
        return NextResponse.json({
          profile: {
            id: authUser.userId,
            email: authUser.email,
            full_name: authUser.metadata?.full_name || authUser.metadata?.name || 'User',
            avatar_url: authUser.metadata?.avatar_url,
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

    // Step 2: 检查 profile 是否存在
    let { data: profileData, error: profileError } = await db
      .from('user_profiles')
      .select('*')
      .eq('user_id', authUser.userId)
      .single();

    // 如果 profile 不存在，创建一个
    if (profileError?.code === 'PGRST116' || !profileData) {
      const { data: newProfile, error: insertProfileError } = await db
        .from('user_profiles')
        .insert({
          user_id: authUser.userId,
          real_name: authUser.metadata?.full_name || authUser.metadata?.name || '',
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (!insertProfileError) {
        profileData = newProfile;
      }
    }

    // Step 3: 获取用户兴趣
    const { data: interestsData } = await db
      .from('users_interests_map')
      .select('interest_id, interests(id, name, category, icon_url)')
      .eq('user_id', authUser.userId);

    // 组装统一的 profile 响应
    const profile = {
      id: authUser.userId,
      email: userData?.email || authUser.email,
      full_name: profileData?.real_name || authUser.metadata?.full_name || authUser.metadata?.name || 'User',
      avatar_url: userData?.avatar_url || authUser.metadata?.avatar_url,
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
      interests: interestsData?.map((i: any) => (i.interests as any)?.name).filter(Boolean) || [],
      credits: profileData?.credits ?? 0,
      is_profile_complete: profileData?.is_profile_complete || false,
      profile_skip_count: profileData?.profile_skip_count ?? 0,
      created_at: userData?.created_at || new Date().toISOString(),
      updated_at: profileData?.updated_at || userData?.updated_at || new Date().toISOString()
    };

    // 🔒 重要：设置防缓存头，确保每次都返回最新的用户资料
    const response = NextResponse.json({ profile });
    response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('X-Accel-Expires', '0');
    
    return response;
  } catch (error) {
    console.error('[User Profile GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // 验证用户身份
    const authUser = await authenticateUser(request);
    
    if (!authUser) {
      return NextResponse.json({ error: 'No authorization header or invalid token' }, { status: 401 });
    }

    // 获取服务端数据库客户端
    const db = await getServiceDbClient();

    const body = await request.json();

    // 分离 user 数据和 profile 数据
    const userData: Record<string, any> = {};
    const profileData: Record<string, any> = {};

    // 映射字段到对应的表
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

    // 更新 users 表
    if (Object.keys(userData).length > 0) {
      userData.updated_at = new Date().toISOString();
      await db
        .from('users')
        .update(userData)
        .eq('id', authUser.userId);
    }

    // 更新 user_profiles 表
    if (Object.keys(profileData).length > 0) {
      profileData.updated_at = new Date().toISOString();

      // 检查 profile 是否存在
      const { data: existingProfile } = await db
        .from('user_profiles')
        .select('user_id')
        .eq('user_id', authUser.userId)
        .single();

      if (existingProfile) {
        const { error: profileUpdateError } = await db
          .from('user_profiles')
          .update(profileData)
          .eq('user_id', authUser.userId);

        if (profileUpdateError) {
          return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
        }
      } else {
        const { error: profileInsertError } = await db
          .from('user_profiles')
          .insert({
            user_id: authUser.userId,
            ...profileData
          });

        if (profileInsertError) {
          return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
        }
      }
    }

    // 返回更新后的 profile 数据
    const { data: updatedUser } = await db
      .from('users')
      .select('*')
      .eq('id', authUser.userId)
      .single();

    const { data: updatedProfile } = await db
      .from('user_profiles')
      .select('*')
      .eq('user_id', authUser.userId)
      .single();

    const profile = {
      id: authUser.userId,
      email: updatedUser?.email || authUser.email,
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
      credits: updatedProfile?.credits ?? 0,
      created_at: updatedUser?.created_at,
      updated_at: updatedProfile?.updated_at || updatedUser?.updated_at
    };

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('[User Profile PUT] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
