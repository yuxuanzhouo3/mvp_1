/**
 * 微信账号绑定 API
 * WeChat Account Binding API
 *
 * 将微信账号绑定到现有用户
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  checkExistingBinding,
  bindWeChatToUser,
} from '@/lib/services/auth/wechat-db';

// 微信 Access Token 接口
const WECHAT_ACCESS_TOKEN_URL = 'https://api.weixin.qq.com/sns/oauth2/access_token';
const WECHAT_USER_INFO_URL = 'https://api.weixin.qq.com/sns/userinfo';

interface WeChatTokenResponse {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  openid?: string;
  scope?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

interface WeChatUserInfo {
  openid: string;
  nickname?: string;
  sex?: number;
  province?: string;
  city?: string;
  country?: string;
  headimgurl?: string;
  privilege?: string[];
  unionid?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, code } = body as {
      userId: string;
      code: string;
    };

    if (!userId || !code) {
      return NextResponse.json(
        { error: '缺少必要参数', errorCode: 'MISSING_PARAMS' },
        { status: 400 }
      );
    }

    // 获取微信配置
    const appId = process.env.WECHAT_APP_ID || process.env.NEXT_PUBLIC_WECHAT_APP_ID;
    const appSecret = process.env.WECHAT_APP_SECRET;

    if (!appId || !appSecret) {
      return NextResponse.json(
        { error: '微信配置错误', errorCode: 'CONFIG_ERROR' },
        { status: 500 }
      );
    }

    // 1. 使用 code 换取 access_token
    const tokenUrl = new URL(WECHAT_ACCESS_TOKEN_URL);
    tokenUrl.searchParams.set('appid', appId);
    tokenUrl.searchParams.set('secret', appSecret);
    tokenUrl.searchParams.set('code', code);
    tokenUrl.searchParams.set('grant_type', 'authorization_code');

    const tokenResponse = await fetch(tokenUrl.toString());
    const tokenData: WeChatTokenResponse = await tokenResponse.json();

    if (tokenData.errcode) {
      console.error('[WeChat Bind] Get access_token error:', tokenData);
      return NextResponse.json(
        { error: tokenData.errmsg || '获取微信授权失败', errorCode: `WECHAT_${tokenData.errcode}` },
        { status: 401 }
      );
    }

    const { access_token, openid, unionid } = tokenData;

    if (!openid) {
      return NextResponse.json(
        { error: '获取微信用户标识失败', errorCode: 'NO_OPENID' },
        { status: 401 }
      );
    }

    // 2. 检查该微信是否已被其他用户绑定
    const existingBinding = await checkExistingBinding(openid, unionid);
    if (existingBinding && existingBinding.userId !== userId) {
      return NextResponse.json(
        { error: '该微信账号已被其他用户绑定', errorCode: 'ALREADY_BOUND' },
        { status: 409 }
      );
    }

    // 3. 获取微信用户信息
    let wechatUserInfo: WeChatUserInfo | null = null;
    if (access_token) {
      try {
        const userInfoUrl = new URL(WECHAT_USER_INFO_URL);
        userInfoUrl.searchParams.set('access_token', access_token);
        userInfoUrl.searchParams.set('openid', openid);
        userInfoUrl.searchParams.set('lang', 'zh_CN');

        const userInfoResponse = await fetch(userInfoUrl.toString());
        wechatUserInfo = await userInfoResponse.json();
      } catch (e) {
        console.warn('[WeChat Bind] Get user info failed:', e);
      }
    }

    // 4. 绑定微信到用户
    await bindWeChatToUser(userId, {
      openid,
      unionid,
      nickname: wechatUserInfo?.nickname,
      avatar: wechatUserInfo?.headimgurl,
    });

    console.log(`[WeChat Bind] User ${userId} bound to WeChat ${openid.slice(0, 8)}...`);

    return NextResponse.json({
      success: true,
      message: '微信绑定成功',
      wechatInfo: {
        nickname: wechatUserInfo?.nickname,
        avatar: wechatUserInfo?.headimgurl,
      },
    });
  } catch (error: any) {
    console.error('[WeChat Bind] Error:', error);
    return NextResponse.json(
      { error: error.message || '绑定失败', errorCode: 'BIND_ERROR' },
      { status: 500 }
    );
  }
}


