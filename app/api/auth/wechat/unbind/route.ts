/**
 * 微信账号解绑 API
 * WeChat Account Unbinding API
 *
 * 解除用户与微信账号的绑定
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getUserLoginMethods,
  unbindWeChatFromUser,
} from '@/lib/services/auth/wechat-db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body as { userId: string };

    if (!userId) {
      return NextResponse.json(
        { error: '缺少用户ID', errorCode: 'MISSING_USER_ID' },
        { status: 400 }
      );
    }

    // 1. 检查用户是否有其他登录方式
    const userLoginMethods = await getUserLoginMethods(userId);
    
    if (userLoginMethods.length <= 1 && userLoginMethods.includes('wechat')) {
      return NextResponse.json(
        { 
          error: '微信是您唯一的登录方式，无法解绑。请先绑定邮箱后再解绑微信。', 
          errorCode: 'ONLY_LOGIN_METHOD' 
        },
        { status: 400 }
      );
    }

    // 2. 执行解绑
    await unbindWeChatFromUser(userId);

    console.log(`[WeChat Unbind] User ${userId} unbound WeChat`);

    return NextResponse.json({
      success: true,
      message: '微信解绑成功',
    });
  } catch (error: any) {
    console.error('[WeChat Unbind] Error:', error);
    return NextResponse.json(
      { error: error.message || '解绑失败', errorCode: 'UNBIND_ERROR' },
      { status: 500 }
    );
  }
}


