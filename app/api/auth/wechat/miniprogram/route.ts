/**
 * 微信小程序登录 API
 * WeChat Mini Program Login API
 *
 * 处理小程序 wx.login 获取的 code，完成用户登录
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  findOrCreateWeChatUser,
  generateSessionToken,
} from '@/lib/services/auth/wechat-db';

// 微信小程序登录凭证校验接口
const WECHAT_CODE2SESSION_URL = 'https://api.weixin.qq.com/sns/jscode2session';

interface Code2SessionResponse {
  openid?: string;
  session_key?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, encryptedData, iv } = body as {
      code: string;
      encryptedData?: string; // 加密的用户信息
      iv?: string; // 加密算法的初始向量
    };

    if (!code) {
      return NextResponse.json(
        { error: '缺少登录凭证 code', errorCode: 'MISSING_CODE' },
        { status: 400 }
      );
    }

    const appId = process.env.WECHAT_MINIPROGRAM_APP_ID;
    const appSecret = process.env.WECHAT_MINIPROGRAM_APP_SECRET;

    if (!appId || !appSecret) {
      console.error('[WeChat MiniProgram] Missing configuration');
      return NextResponse.json(
        { error: '小程序配置错误', errorCode: 'CONFIG_ERROR' },
        { status: 500 }
      );
    }

    // 1. 调用微信 code2Session 接口
    const sessionUrl = new URL(WECHAT_CODE2SESSION_URL);
    sessionUrl.searchParams.set('appid', appId);
    sessionUrl.searchParams.set('secret', appSecret);
    sessionUrl.searchParams.set('js_code', code);
    sessionUrl.searchParams.set('grant_type', 'authorization_code');

    const sessionResponse = await fetch(sessionUrl.toString());
    const sessionData: Code2SessionResponse = await sessionResponse.json();

    if (sessionData.errcode) {
      console.error('[WeChat MiniProgram] code2Session error:', sessionData);
      return NextResponse.json(
        { 
          error: sessionData.errmsg || '微信登录失败', 
          errorCode: `WECHAT_${sessionData.errcode}` 
        },
        { status: 401 }
      );
    }

    const { openid, unionid, session_key } = sessionData;

    if (!openid) {
      return NextResponse.json(
        { error: '获取用户标识失败', errorCode: 'NO_OPENID' },
        { status: 401 }
      );
    }

    // 2. 解密用户信息（如果提供了加密数据）
    let userInfo: any = null;
    if (encryptedData && iv && session_key) {
      try {
        userInfo = await decryptUserInfo(encryptedData, iv, session_key, appId);
      } catch (decryptError) {
        console.warn('[WeChat MiniProgram] Decrypt user info failed:', decryptError);
        // 解密失败不影响登录，继续使用 openid
      }
    }

    // 3. 查找或创建用户
    // 这里应该调用数据库服务，根据 openid/unionid 查找用户
    // 如果用户不存在，则创建新用户
    const user = await findOrCreateWeChatUser({
      openid,
      unionid,
      userInfo,
    });

    // 4. 生成会话 token
    const accessToken = generateSessionToken(user.id);

    console.log(`[WeChat MiniProgram] User logged in: ${openid.slice(0, 8)}...`);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
      session: {
        accessToken,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7天过期
      },
    });
  } catch (error: any) {
    console.error('[WeChat MiniProgram] Login error:', error);
    return NextResponse.json(
      { error: error.message || '登录失败', errorCode: 'LOGIN_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * 解密微信用户信息
 * 使用 AES-128-CBC 解密
 */
async function decryptUserInfo(
  encryptedData: string, 
  iv: string, 
  sessionKey: string,
  appId: string
): Promise<any> {
  // 注意：实际生产环境应使用 crypto 库进行解密
  // 这里是简化示例
  const crypto = require('crypto');
  
  const decipher = crypto.createDecipheriv(
    'aes-128-cbc',
    Buffer.from(sessionKey, 'base64'),
    Buffer.from(iv, 'base64')
  );
  
  let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  const userInfo = JSON.parse(decrypted);
  
  // 验证 appId
  if (userInfo.watermark?.appid !== appId) {
    throw new Error('Invalid watermark');
  }
  
  return userInfo;
}


