/**
 * CN 环境邮箱登录 API
 * 从 Cloudbase users 集合验证用户
 * 
 * 重要：通过响应头 Set-Cookie 设置认证 cookie，确保云环境下可靠性
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  // 检查部署区域 - 直接从环境变量读取，避免构建时问题
  const deploymentRegion = process.env.NEXT_PUBLIC_DEPLOYMENT_REGION;
  const isCN = deploymentRegion === 'CN';
  
  console.log(`[CN Login] Environment check: NEXT_PUBLIC_DEPLOYMENT_REGION=${deploymentRegion}, isCN=${isCN}`);
  
  // 仅 CN 环境可用
  if (!isCN) {
    console.log('[CN Login] Rejected: Not CN environment');
    return NextResponse.json(
      { error: 'This endpoint is only available in CN environment' },
      { status: 403 }
    );
  }

  try {
    const { email, password } = await request.json();
    
    console.log(`[CN Login] Login attempt for email: ${email}`);

    // 验证必填字段
    if (!email || !password) {
      return NextResponse.json(
        { error: '邮箱和密码为必填项' },
        { status: 400 }
      );
    }

    // 动态导入 Cloudbase Node SDK
    let cloudbase;
    try {
      cloudbase = await import('@cloudbase/node-sdk');
    } catch (importError) {
      console.error('[CN Login] Cloudbase SDK import error:', importError);
      return NextResponse.json(
        { error: 'Cloudbase SDK not installed. Run: npm install @cloudbase/node-sdk' },
        { status: 500 }
      );
    }

    const envId = process.env.CLOUDBASE_ENV_ID || process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID || '';
    console.log(`[CN Login] Cloudbase env: ${envId ? envId.substring(0, 10) + '...' : 'NOT SET'}`);
    
    if (!envId) {
      console.error('[CN Login] Cloudbase ENV_ID not configured');
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

    // 查找用户
    const userResult = await usersCollection.where({ email }).limit(1).get();

    if (!userResult.data || userResult.data.length === 0) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 401 }
      );
    }

    const user = userResult.data[0];

    // 验证密码（使用 bcrypt 比对哈希）
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: '密码错误' },
        { status: 401 }
      );
    }

    // 更新最后登录时间
    await usersCollection.doc(user._id).update({
      last_login_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // 确保返回正确的用户 ID
    const userId = user.id || user._id;
    console.log('[CN Login] User logged in:', { userId, email: user.email });

    // 创建响应对象，添加防缓存头
    const response = NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: user.email,
        displayName: user.display_name || user.email?.split('@')[0],
        avatarUrl: user.avatar_url,
        provider: user.provider || 'email',
      },
    });
    
    // 🔒 重要：设置防缓存头，防止 CDN 缓存认证响应
    response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('X-Accel-Expires', '0'); // Nginx 缓存控制

    // 重要：通过响应头设置 cn_session cookie
    // 根据请求协议决定是否设置 secure 属性（而不是依赖 NODE_ENV）
    const forwardedProto = request.headers.get('x-forwarded-proto');
    const isSecureRequest = forwardedProto
      ? forwardedProto.split(',')[0].trim() === 'https'
      : request.url.startsWith('https://');
    const host = request.headers.get('host') || '';
    const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1');
    const isSecureCookie = isSecureRequest || !isLocalhost;
    
    // 设置 cookie，确保在无痕模式下也能正常工作
    response.cookies.set('cn_session', userId, {
      httpOnly: false, // 允许客户端读取（用于状态检查）
      secure: isSecureCookie, // 根据请求协议与环境兜底决定
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 天
    });

    if (!isLocalhost) {
      response.cookies.set('cn_session_cross', userId, {
        httpOnly: false,
        secure: true,
        sameSite: 'none',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      });
    }

    console.log(`[CN Login] Cookie set via response header for user: ${userId}, secure: ${isSecureCookie}`);

    return response;
  } catch (error: any) {
    console.error('[CN Login] Error:', error);
    return NextResponse.json(
      { error: error.message || '登录失败' },
      { status: 500 }
    );
  }
}
