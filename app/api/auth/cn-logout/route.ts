/**
 * CN 环境登出 API
 * 通过服务端响应头清除认证 cookie
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // 仅 CN 环境可用
  const deploymentRegion =
    process.env.DEPLOYMENT_REGION || process.env.NEXT_PUBLIC_DEPLOYMENT_REGION;
  const isCN = deploymentRegion === 'CN';

  if (!isCN) {
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
    
    // 🔒 添加防缓存头
    response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('X-Accel-Expires', '0');

    // 通过设置 maxAge 为 0 来删除 cookie
    // 根据请求协议决定是否设置 secure 属性
    const forwardedProto = request.headers.get('x-forwarded-proto');
    const isSecureRequest = forwardedProto
      ? forwardedProto.split(',')[0].trim() === 'https'
      : request.url.startsWith('https://');
    const host = request.headers.get('host') || '';
    const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1');
    const isSecureCookie = isSecureRequest || !isLocalhost;
    
    response.cookies.set('cn_session', '', {
      httpOnly: false,
      secure: isSecureCookie,
      sameSite: 'lax',
      path: '/',
      maxAge: 0, // 立即过期，删除 cookie
    });

    if (!isLocalhost) {
      response.cookies.set('cn_session_cross', '', {
        httpOnly: false,
        secure: true,
        sameSite: 'none',
        path: '/',
        maxAge: 0,
      });
    }

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

