/**
 * CN 环境邮箱登录 API
 * 从 Cloudbase users 集合验证用户
 */

import { NextRequest, NextResponse } from 'next/server';
import { isChinaDeployment } from '@/lib/config/deployment.config';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  // 仅 CN 环境可用
  if (!isChinaDeployment()) {
    return NextResponse.json(
      { error: 'This endpoint is only available in CN environment' },
      { status: 403 }
    );
  }

  try {
    const { email, password } = await request.json();

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
    } catch {
      return NextResponse.json(
        { error: 'Cloudbase SDK not installed. Run: npm install @cloudbase/node-sdk' },
        { status: 500 }
      );
    }

    const app = cloudbase.init({
      env: process.env.CLOUDBASE_ENV_ID || process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID || '',
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

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: user.email,
        displayName: user.display_name || user.email?.split('@')[0],
        avatarUrl: user.avatar_url,
        provider: user.provider || 'email',
      },
    });
  } catch (error: any) {
    console.error('[CN Login] Error:', error);
    return NextResponse.json(
      { error: error.message || '登录失败' },
      { status: 500 }
    );
  }
}
