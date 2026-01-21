/**
 * 环信 IM Token 获取
 * Easemob IM Token API
 * 
 * 仅在 CN 环境使用
 */

import { NextRequest, NextResponse } from 'next/server';
import { isChinaDeployment } from '@/lib/config/deployment.config';

// 环信 REST API 配置
const EASEMOB_API_BASE = process.env.EASEMOB_API_BASE || 'https://a1.easemob.com';
const EASEMOB_ORG_NAME = process.env.EASEMOB_ORG_NAME || '';
const EASEMOB_APP_NAME = process.env.EASEMOB_APP_NAME || '';
const EASEMOB_CLIENT_ID = process.env.EASEMOB_CLIENT_ID || '';
const EASEMOB_CLIENT_SECRET = process.env.EASEMOB_CLIENT_SECRET || '';

// Token 缓存
let adminToken: string | null = null;
let tokenExpiresAt: number = 0;

function parseEasemobAppKey(appKey: string): { orgName: string; appName: string } | null {
  const [orgName, appName] = appKey.split('#');
  if (!orgName || !appName) return null;
  return { orgName, appName };
}

function validateEasemobConfigConsistency(): void {
  const publicAppKey = process.env.NEXT_PUBLIC_EASEMOB_APP_KEY || '';
  const parsed = publicAppKey ? parseEasemobAppKey(publicAppKey) : null;
  
  // 如果客户端使用默认占位符值，跳过验证（构建时的默认值）
  if (!parsed) return;
  if (parsed.orgName === 'your_org' && parsed.appName === 'your_app_name') {
    console.log('[Easemob] Client using placeholder appKey, skipping consistency check');
    return;
  }
  
  if (parsed.orgName !== EASEMOB_ORG_NAME || parsed.appName !== EASEMOB_APP_NAME) {
    throw new Error(
      `Easemob config mismatch: NEXT_PUBLIC_EASEMOB_APP_KEY expects ${parsed.orgName}/${parsed.appName}, but server is configured for ${EASEMOB_ORG_NAME}/${EASEMOB_APP_NAME}`
    );
  }
}

/**
 * 获取管理员 Token
 */
async function getAdminToken(): Promise<string> {
  // 检查缓存
  if (adminToken && Date.now() < tokenExpiresAt - 5 * 60 * 1000) {
    return adminToken;
  }

  const url = `${EASEMOB_API_BASE}/${EASEMOB_ORG_NAME}/${EASEMOB_APP_NAME}/token`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: EASEMOB_CLIENT_ID,
      client_secret: EASEMOB_CLIENT_SECRET,
    }),
  });

  if (!response.ok) {
    const error = await response.text().catch(() => '');
    console.error('[Easemob] Get admin token failed:', response.status, error);
    throw new Error(`Failed to get Easemob admin token (status ${response.status})`);
  }

  const data = await response.json();
  adminToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;

  return adminToken as string;
}

/**
 * 获取用户 Token
 */
async function getUserToken(userId: string): Promise<{ accessToken: string; expiresIn: number }> {
  const adminAccessToken = await getAdminToken();
  
  const url = `${EASEMOB_API_BASE}/${EASEMOB_ORG_NAME}/${EASEMOB_APP_NAME}/token`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminAccessToken}`,
    },
    body: JSON.stringify({
      grant_type: 'inherit',
      username: userId,
      autoCreateUser: true, // 如果用户不存在则自动创建
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[Easemob] Get user token failed:', response.status, error);
    throw new Error(`Failed to get Easemob user token (status ${response.status})`);
  }

  const data = await response.json();
  
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

/**
 * 注册用户（如果不存在）
 */
async function ensureUserExists(userId: string, username?: string): Promise<void> {
  const adminAccessToken = await getAdminToken();
  
  // 尝试创建用户，如果已存在会返回错误，忽略即可
  const url = `${EASEMOB_API_BASE}/${EASEMOB_ORG_NAME}/${EASEMOB_APP_NAME}/users`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminAccessToken}`,
    },
    body: JSON.stringify({
      username: userId,
      password: `user_${userId}_pwd`,
      nickname: username || userId,
    }),
  });

  if (response.ok) {
    return;
  }

  const errorText = await response.text().catch(() => '');
  const mayAlreadyExist =
    response.status === 409 ||
    /duplicate|already exists|exist/i.test(errorText) ||
    /duplicate_unique_property_exists/i.test(errorText);

  if (mayAlreadyExist) {
    return;
  }

  console.error('[Easemob] Create user failed:', response.status, errorText);
  throw new Error(`Failed to ensure Easemob user exists (status ${response.status})`);
}

/**
 * 发送系统消息（用于创建会话）
 * 通过 REST API 从系统账号发送消息
 */
async function sendSystemMessage(
  fromUserId: string,
  toUserId: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  if (!isChinaDeployment()) {
    return { success: false, error: 'Only available in CN region' };
  }

  if (!EASEMOB_ORG_NAME || !EASEMOB_APP_NAME) {
    return { success: false, error: 'Easemob not configured' };
  }

  try {
    const adminAccessToken = await getAdminToken();
    const url = `${EASEMOB_API_BASE}/${EASEMOB_ORG_NAME}/${EASEMOB_APP_NAME}/messages/users`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminAccessToken}`,
      },
      body: JSON.stringify({
        from: fromUserId,
        to: [toUserId],
        type: 'txt',
        body: {
          msg: message,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Easemob] Send system message failed:', error);
      return { success: false, error: 'Failed to send message' };
    }

    console.log(`[Easemob] System message sent from ${fromUserId} to ${toUserId}`);
    return { success: true };
  } catch (error: any) {
    console.error('[Easemob] Send system message error:', error);
    return { success: false, error: error.message };
  }
}

export async function POST(request: NextRequest) {
  // 检查是否为 CN 环境
  if (!isChinaDeployment()) {
    return NextResponse.json(
      { error: 'Easemob IM is only available in CN region' },
      { status: 400 }
    );
  }

  // 验证环信配置
  if (!EASEMOB_ORG_NAME || !EASEMOB_APP_NAME || !EASEMOB_CLIENT_ID || !EASEMOB_CLIENT_SECRET) {
    return NextResponse.json(
      { error: 'Easemob IM is not configured' },
      { status: 500 }
    );
  }

  try {
    validateEasemobConfigConsistency();
    const { userId, username } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // 确保用户存在
    await ensureUserExists(userId, username);

    // 获取用户 Token
    const { accessToken, expiresIn } = await getUserToken(userId);

    console.log('[Easemob] Token generated for user:', userId);

    // 返回 appKey 配置，让前端使用服务端的配置
    const serverAppKey = `${EASEMOB_ORG_NAME}#${EASEMOB_APP_NAME}`;

    return NextResponse.json({
      accessToken,
      expiresIn,
      userId,
      appKey: serverAppKey, // 返回服务端配置的 appKey
    });
  } catch (error: any) {
    console.error('[Easemob Token] Error:', error);
    return NextResponse.json(
      { error: error.message || '获取聊天 Token 失败' },
      { status: 500 }
    );
  }
}

