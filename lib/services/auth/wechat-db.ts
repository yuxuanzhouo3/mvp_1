/**
 * 微信登录数据库服务 (CN环境)
 * WeChat Login Database Service
 *
 * 提供微信登录相关的数据库操作
 */

import { getServiceDbClient } from '@/lib/db-client';
import { createUserSession as createSessionJwt, verifySessionToken as verifySessionJwt } from '@/lib/auth/session';

// 用户表名
const USERS_TABLE = 'users';

export interface WeChatUserData {
  openid: string;
  unionid?: string;
  nickname?: string;
  avatar?: string;
  sex?: number;
  province?: string;
  city?: string;
  country?: string;
}

export interface UserRecord {
  id: string;
  email?: string;
  display_name?: string;
  avatar_url?: string;
  wechat_openid?: string;
  wechat_unionid?: string;
  wechat_nickname?: string;
  wechat_avatar?: string;
  phone?: string;
  auth_providers?: string[];
  created_at?: string;
  updated_at?: string;
}

/**
 * 根据微信 openid/unionid 查找用户
 */
export async function findUserByWeChat(
  openid: string,
  unionid?: string
): Promise<UserRecord | null> {
  const db = await getServiceDbClient();

  // 优先使用 unionid 查找（跨应用统一标识）
  if (unionid) {
    const { data: unionidUser } = await db
      .from(USERS_TABLE)
      .select('*')
      .eq('wechat_unionid', unionid)
      .single();

    if (unionidUser) {
      return unionidUser;
    }
  }

  // 使用 openid 查找
  const { data: openidUser } = await db
    .from(USERS_TABLE)
    .select('*')
    .eq('wechat_openid', openid)
    .single();

  return openidUser || null;
}

/**
 * 创建微信用户
 */
export async function createWeChatUser(
  wechatData: WeChatUserData
): Promise<UserRecord> {
  const db = await getServiceDbClient();

  // 生成唯一的用户ID
  const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

  const newUser = {
    id: userId,
    display_name: wechatData.nickname || `微信用户${wechatData.openid.slice(-4)}`,
    avatar_url: wechatData.avatar,
    wechat_openid: wechatData.openid,
    wechat_unionid: wechatData.unionid,
    wechat_nickname: wechatData.nickname,
    wechat_avatar: wechatData.avatar,
    auth_providers: ['wechat'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await db
    .from(USERS_TABLE)
    .insert(newUser)
    .select()
    .single();

  if (error) {
    console.error('[WeChat DB] Create user error:', error);
    throw new Error('创建用户失败');
  }

  return data;
}

/**
 * 查找或创建微信用户
 */
export async function findOrCreateWeChatUser(params: {
  openid: string;
  unionid?: string;
  userInfo?: {
    nickname?: string;
    headimgurl?: string;
    nickName?: string;
    avatarUrl?: string;
    sex?: number;
  } | null;
  loginType?: string;
}): Promise<{ id: string; displayName?: string; avatarUrl?: string }> {
  const { openid, unionid, userInfo } = params;

  // 查找现有用户
  let user = await findUserByWeChat(openid, unionid);

  if (user) {
    // 更新用户信息（如果有新的微信信息）
    if (userInfo && (userInfo.nickname || userInfo.nickName || userInfo.headimgurl || userInfo.avatarUrl)) {
      const db = await getServiceDbClient();
      const updateData: Partial<UserRecord> = {
        updated_at: new Date().toISOString(),
      };

      const nickname = userInfo.nickname || userInfo.nickName;
      const avatar = userInfo.headimgurl || userInfo.avatarUrl;

      if (nickname && nickname !== user.wechat_nickname) {
        updateData.wechat_nickname = nickname;
        if (!user.display_name || user.display_name.startsWith('微信用户')) {
          updateData.display_name = nickname;
        }
      }
      if (avatar && avatar !== user.wechat_avatar) {
        updateData.wechat_avatar = avatar;
        if (!user.avatar_url) {
          updateData.avatar_url = avatar;
        }
      }

      if (Object.keys(updateData).length > 1) {
        await db.from(USERS_TABLE).update(updateData).eq('id', user.id);
      }
    }

    return {
      id: user.id,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
    };
  }

  // 创建新用户
  const newUser = await createWeChatUser({
    openid,
    unionid,
    nickname: userInfo?.nickname || userInfo?.nickName,
    avatar: userInfo?.headimgurl || userInfo?.avatarUrl,
    sex: userInfo?.sex,
  });

  return {
    id: newUser.id,
    displayName: newUser.display_name,
    avatarUrl: newUser.avatar_url,
  };
}

/**
 * 检查微信是否已被其他用户绑定
 */
export async function checkExistingBinding(
  openid: string,
  unionid?: string
): Promise<{ userId: string } | null> {
  const user = await findUserByWeChat(openid, unionid);

  if (user) {
    return { userId: user.id };
  }

  return null;
}

/**
 * 绑定微信到用户
 */
export async function bindWeChatToUser(
  userId: string,
  wechatData: {
    openid: string;
    unionid?: string;
    nickname?: string;
    avatar?: string;
  }
): Promise<void> {
  const db = await getServiceDbClient();

  // 获取当前用户
  const { data: user } = await db
    .from(USERS_TABLE)
    .select('auth_providers')
    .eq('id', userId)
    .single();

  const currentProviders = user?.auth_providers || [];
  const newProviders = currentProviders.includes('wechat')
    ? currentProviders
    : [...currentProviders, 'wechat'];

  const updateData = {
    wechat_openid: wechatData.openid,
    wechat_unionid: wechatData.unionid,
    wechat_nickname: wechatData.nickname,
    wechat_avatar: wechatData.avatar,
    auth_providers: newProviders,
    updated_at: new Date().toISOString(),
  };

  const { error } = await db
    .from(USERS_TABLE)
    .update(updateData)
    .eq('id', userId);

  if (error) {
    console.error('[WeChat DB] Bind error:', error);
    throw new Error('绑定微信失败');
  }
}

/**
 * 解绑用户的微信账号
 */
export async function unbindWeChatFromUser(userId: string): Promise<void> {
  const db = await getServiceDbClient();

  // 获取当前用户
  const { data: user } = await db
    .from(USERS_TABLE)
    .select('auth_providers')
    .eq('id', userId)
    .single();

  const currentProviders = user?.auth_providers || [];
  const newProviders = currentProviders.filter((p: string) => p !== 'wechat');

  const updateData = {
    wechat_openid: null,
    wechat_unionid: null,
    wechat_nickname: null,
    wechat_avatar: null,
    auth_providers: newProviders,
    updated_at: new Date().toISOString(),
  };

  const { error } = await db
    .from(USERS_TABLE)
    .update(updateData)
    .eq('id', userId);

  if (error) {
    console.error('[WeChat DB] Unbind error:', error);
    throw new Error('解绑微信失败');
  }
}

/**
 * 获取用户的登录方式列表
 */
export async function getUserLoginMethods(userId: string): Promise<string[]> {
  const db = await getServiceDbClient();

  const { data: user } = await db
    .from(USERS_TABLE)
    .select('email, phone, auth_providers, wechat_openid')
    .eq('id', userId)
    .single();

  if (!user) {
    return [];
  }

  const methods: string[] = [];

  // 检查邮箱
  if (user.email) {
    methods.push('email');
  }

  // 检查手机
  if (user.phone) {
    methods.push('phone');
  }

  // 检查微信
  if (user.wechat_openid) {
    methods.push('wechat');
  }

  // 合并 auth_providers
  if (user.auth_providers && Array.isArray(user.auth_providers)) {
    for (const provider of user.auth_providers) {
      if (!methods.includes(provider)) {
        methods.push(provider);
      }
    }
  }

  return methods;
}

/**
 * 创建用户会话 (JWT)
 */
export async function createUserSession(
  userId: string
): Promise<string> {
  return createSessionJwt(userId);
}

/**
 * 验证会话 Token
 */
export async function verifySessionToken(
  token: string
): Promise<{ userId: string } | null> {
  const verified = await verifySessionJwt(token);
  if (!verified.ok) return null;
  return { userId: verified.value.userId };
}
