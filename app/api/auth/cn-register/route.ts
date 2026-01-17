/**
 * CN 环境邮箱注册 API
 * 直接写入 Cloudbase users 集合，不需要邮箱验证
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
    const { email, password, displayName, phone } = await request.json();

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

    // 检查邮箱是否已存在
    const existingUser = await usersCollection.where({ email }).limit(1).get();
    if (existingUser.data && existingUser.data.length > 0) {
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
      display_name: displayName || null,
      phone: phone || null,
      avatar_url: null,
      provider: 'email',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true,
      email_verified: true, // CN环境直接标记为已验证
    });

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email,
        displayName,
        provider: 'email',
      },
    });
  } catch (error: any) {
    console.error('[CN Register] Error:', error);
    return NextResponse.json(
      { error: error.message || '注册失败' },
      { status: 500 }
    );
  }
}
