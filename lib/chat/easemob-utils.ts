/**
 * 环信 IM 工具函数
 */

import { isChinaDeployment } from '@/lib/config/deployment.config';

const EASEMOB_API_BASE = process.env.EASEMOB_API_BASE || 'https://a1.easemob.com';
const EASEMOB_ORG_NAME = process.env.EASEMOB_ORG_NAME || '';
const EASEMOB_APP_NAME = process.env.EASEMOB_APP_NAME || '';
const EASEMOB_CLIENT_ID = process.env.EASEMOB_CLIENT_ID || '';
const EASEMOB_CLIENT_SECRET = process.env.EASEMOB_CLIENT_SECRET || '';

let adminToken: string | null = null;
let tokenExpiresAt: number = 0;

async function getAdminToken(): Promise<string> {
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
    throw new Error('Failed to get Easemob admin token');
  }

  const data = await response.json();
  adminToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;

  return adminToken as string;
}

export async function sendSystemMessage(
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
