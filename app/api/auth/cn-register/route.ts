/**
 * CN 环境邮箱注册 API
 * 直接写入 Cloudbase users 集合，不需要邮箱验证
 * 
 * 注册成功后自动设置认证 cookie，实现注册即登录
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  // 检查部署区域 - 直接从环境变量读取，避免构建时问题
  const deploymentRegion = process.env.NEXT_PUBLIC_DEPLOYMENT_REGION;
  const isCN = deploymentRegion === 'CN';
  
  console.log(`[CN Register] Environment check: NEXT_PUBLIC_DEPLOYMENT_REGION=${deploymentRegion}, isCN=${isCN}`);
  
  // 仅 CN 环境可用
  if (!isCN) {
    console.log('[CN Register] Rejected: Not CN environment');
    return NextResponse.json(
      { error: 'This endpoint is only available in CN environment' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { email, password, displayName, phone } = body;
    
    console.log(`[CN Register] Registration attempt for email: ${email}`);

    // 验证必填字段
    if (!email || !password) {
      console.log('[CN Register] Validation failed: missing email or password');
      return NextResponse.json(
        { error: '邮箱和密码为必填项' },
        { status: 400 }
      );
    }

    // 验证密码长度
    if (password.length < 6) {
      console.log('[CN Register] Validation failed: password too short');
      return NextResponse.json(
        { error: '密码长度至少6位' },
        { status: 400 }
      );
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('[CN Register] Validation failed: invalid email format');
      return NextResponse.json(
        { error: '邮箱格式不正确' },
        { status: 400 }
      );
    }

    // 动态导入 Cloudbase Node SDK
    let cloudbase;
    try {
      cloudbase = await import('@cloudbase/node-sdk');
    } catch (importError) {
      console.error('[CN Register] Cloudbase SDK import error:', importError);
      return NextResponse.json(
        { error: 'Cloudbase SDK not installed. Run: npm install @cloudbase/node-sdk' },
        { status: 500 }
      );
    }

    const envId = process.env.CLOUDBASE_ENV_ID || process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID || '';
    console.log(`[CN Register] Cloudbase env: ${envId ? envId.substring(0, 10) + '...' : 'NOT SET'}`);
    
    if (!envId) {
      console.error('[CN Register] Cloudbase ENV_ID not configured');
      return NextResponse.json(
        { error: '服务配置错误：Cloudbase ENV_ID 未设置' },
        { status: 500 }
      );
    }

    const app = cloudbase.init({
      env: envId,
      secretId: process.env.CLOUDBASE_SECRET_ID,
      secretKey: process.env.CLOUDBASE_SECRET_KEY,
    });

    const db = app.database();
    const usersCollection = db.collection('users');

    // 检查邮箱是否已存在
    const existingUser = await usersCollection.where({ email }).limit(1).get();
    if (existingUser.data && existingUser.data.length > 0) {
      console.log(`[CN Register] Email already registered: ${email}`);
      return NextResponse.json(
        { error: '该邮箱已被注册' },
        { status: 400 }
      );
    }

    // 生成唯一用户ID
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 密码哈希加密
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户记录
    await usersCollection.add({
      id: userId,
      email,
      password: hashedPassword,
      display_name: displayName || email.split('@')[0],
      phone: phone || null,
      avatar_url: null,
      provider: 'email',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true,
      email_verified: true, // CN环境直接标记为已验证
    });

    console.log(`[CN Register] User created successfully: ${userId}, ${email}`);

    // 创建响应并设置认证 cookie（注册即登录）
    const response = NextResponse.json({
      success: true,
      user: {
        id: userId,
        email,
        displayName: displayName || email.split('@')[0],
        provider: 'email',
      },
    });

    // 设置 cn_session cookie，实现注册即登录
    const forwardedProto = request.headers.get('x-forwarded-proto');
    const isSecureRequest = forwardedProto
      ? forwardedProto.split(',')[0].trim() === 'https'
      : request.url.startsWith('https://');
    response.cookies.set('cn_session', userId, {
      httpOnly: false,
      secure: isSecureRequest,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 天
    });

    console.log(`[CN Register] Cookie set for user: ${userId}, secure: ${isSecureRequest}`);

    return response;
  } catch (error: any) {
    console.error('[CN Register] Error:', error);
    return NextResponse.json(
      { error: error.message || '注册失败，请稍后重试' },
      { status: 500 }
    );
  }
}
