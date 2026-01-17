/**
 * OAuth 登录 API
 * OAuth Login API
 * 
 * 根据部署环境提供不同的 OAuth 提供商:
 * - CN 环境: 微信登录
 * - INTL 环境: Google 登录
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthService } from '@/lib/services/auth';
import { isChinaDeployment } from '@/lib/config/deployment.config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      provider,
      redirectUrl,
    } = body as {
      provider: 'google' | 'wechat';
      redirectUrl?: string;
    };

    if (!provider) {
      return NextResponse.json(
        { error: 'OAuth provider is required' },
        { status: 400 }
      );
    }

    const authService = getAuthService();
    const isCN = isChinaDeployment();

    // 验证提供商是否可用
    const availableProviders = authService.getAvailableOAuthProviders();
    const selectedProvider = availableProviders.find(p => p.id === provider);

    if (!selectedProvider || !selectedProvider.available) {
      return NextResponse.json(
        {
          error: `OAuth provider '${provider}' is not available in ${isCN ? 'CN' : 'INTL'} region`,
          availableProviders: availableProviders.filter(p => p.available).map(p => p.id),
        },
        { status: 400 }
      );
    }

    // 发起 OAuth 登录
    const result = await authService.signInWithOAuth(
      provider,
      redirectUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
    );

    if (!result.success) {
      return NextResponse.json(
        { 
          error: result.error || 'OAuth initialization failed',
          errorCode: result.errorCode,
        },
        { status: 500 }
      );
    }

    // 返回重定向 URL (如果有)
    // 对于 Supabase OAuth，会自动处理重定向
    // 对于微信 OAuth，需要返回授权 URL
    return NextResponse.json({
      success: true,
      provider,
      redirectUrl: result.session?.accessToken, // 微信场景下这里存储 OAuth URL
      region: isCN ? 'CN' : 'INTL',
    });
  } catch (error: any) {
    console.error('[OAuth] Error:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'OAuth service error',
        errorCode: 'OAUTH_SERVICE_ERROR',
      },
      { status: 500 }
    );
  }
}

// 获取可用的 OAuth 提供商
export async function GET() {
  const authService = getAuthService();
  const isCN = isChinaDeployment();

  const providers = authService.getAvailableOAuthProviders();

  return NextResponse.json({
    region: isCN ? 'CN' : 'INTL',
    providers: providers.map(p => ({
      id: p.id,
      name: p.name,
      icon: p.icon,
      available: p.available,
    })),
  });
}

