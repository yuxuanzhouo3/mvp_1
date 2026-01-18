/**
 * CN 环境登出 API
 * 通过服务端响应头清除认证 cookie
 */

import { NextRequest, NextResponse } from 'next/server';
import { isChinaDeployment } from '@/lib/config/deployment.config';

export async function POST(request: NextRequest) {
  // 仅 CN 环境可用
  if (!isChinaDeployment()) {
    return NextResponse.json(
      { error: 'This endpoint is only available in CN environment' },
      { status: 403 }
    );
  }

  try {
    console.log('[CN Logout] Processing logout request...');

    // 创建响应对象
    const response = NextResponse.json({
      success: true,
      message: '登出成功',
    });

    // 通过设置 maxAge 为 0 来删除 cookie
    // 根据请求协议决定是否设置 secure 属性
    const requestUrl = request.url;
    const isSecureRequest = requestUrl.startsWith('https://');
    
    response.cookies.set('cn_session', '', {
      httpOnly: false,
      secure: isSecureRequest,
      sameSite: 'lax',
      path: '/',
      maxAge: 0, // 立即过期，删除 cookie
    });

    console.log('[CN Logout] Cookie cleared via response header');

    return response;
  } catch (error: any) {
    console.error('[CN Logout] Error:', error);
    return NextResponse.json(
      { error: error.message || '登出失败' },
      { status: 500 }
    );
  }
}

