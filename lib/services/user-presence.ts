/**
 * 用户在线状态服务
 * 使用 Redis 跟踪用户当前所在的聊天室
 * 用于优化推送通知：只在用户不在聊天室时发送推送
 */

import { Redis } from '@upstash/redis';

// 初始化 Redis 客户端
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

// Redis 键前缀
const ACTIVE_ROOM_PREFIX = 'user:active_room:';
const USER_ONLINE_PREFIX = 'user:online:';

// 在线状态过期时间（秒）- 5分钟
const PRESENCE_TTL = 300;

/**
 * 设置用户当前所在的聊天室
 * 用户进入聊天室时调用
 */
export async function setUserActiveRoom(userId: string, roomId: string): Promise<void> {
  try {
    const key = `${ACTIVE_ROOM_PREFIX}${userId}`;
    await redis.set(key, roomId, { ex: PRESENCE_TTL });
    console.log(`[Presence] User ${userId} entered room ${roomId}`);
  } catch (error) {
    console.warn('[Presence] Failed to set active room:', error);
  }
}

/**
 * 清除用户的活跃聊天室
 * 用户离开聊天室时调用
 */
export async function clearUserActiveRoom(userId: string): Promise<void> {
  try {
    const key = `${ACTIVE_ROOM_PREFIX}${userId}`;
    await redis.del(key);
    console.log(`[Presence] User ${userId} left chat room`);
  } catch (error) {
    console.warn('[Presence] Failed to clear active room:', error);
  }
}

/**
 * 获取用户当前所在的聊天室
 */
export async function getUserActiveRoom(userId: string): Promise<string | null> {
  try {
    const key = `${ACTIVE_ROOM_PREFIX}${userId}`;
    const roomId = await redis.get<string>(key);
    return roomId;
  } catch (error) {
    console.warn('[Presence] Failed to get active room:', error);
    return null;
  }
}

/**
 * 检查用户是否在指定聊天室
 */
export async function isUserInRoom(userId: string, roomId: string): Promise<boolean> {
  try {
    const activeRoom = await getUserActiveRoom(userId);
    return activeRoom === roomId;
  } catch (error) {
    console.warn('[Presence] Failed to check user in room:', error);
    return false;
  }
}

/**
 * 刷新用户在聊天室的活跃状态（心跳）
 * 用于保持在线状态
 */
export async function refreshUserPresence(userId: string, roomId: string): Promise<void> {
  try {
    const key = `${ACTIVE_ROOM_PREFIX}${userId}`;
    // 只有当用户仍在同一个房间时才刷新
    const currentRoom = await redis.get<string>(key);
    if (currentRoom === roomId) {
      await redis.expire(key, PRESENCE_TTL);
    }
  } catch (error) {
    console.warn('[Presence] Failed to refresh presence:', error);
  }
}

/**
 * 设置用户在线状态
 */
export async function setUserOnline(userId: string): Promise<void> {
  try {
    const key = `${USER_ONLINE_PREFIX}${userId}`;
    await redis.set(key, Date.now().toString(), { ex: PRESENCE_TTL });
  } catch (error) {
    console.warn('[Presence] Failed to set user online:', error);
  }
}

/**
 * 检查用户是否在线
 */
export async function isUserOnline(userId: string): Promise<boolean> {
  try {
    const key = `${USER_ONLINE_PREFIX}${userId}`;
    const exists = await redis.exists(key);
    return exists === 1;
  } catch (error) {
    console.warn('[Presence] Failed to check user online:', error);
    return false;
  }
}

/**
 * 清除用户在线状态（登出时调用）
 */
export async function clearUserOnline(userId: string): Promise<void> {
  try {
    const onlineKey = `${USER_ONLINE_PREFIX}${userId}`;
    const roomKey = `${ACTIVE_ROOM_PREFIX}${userId}`;
    await Promise.all([
      redis.del(onlineKey),
      redis.del(roomKey),
    ]);
    console.log(`[Presence] User ${userId} offline`);
  } catch (error) {
    console.warn('[Presence] Failed to clear user online:', error);
  }
}

export default {
  setUserActiveRoom,
  clearUserActiveRoom,
  getUserActiveRoom,
  isUserInRoom,
  refreshUserPresence,
  setUserOnline,
  isUserOnline,
  clearUserOnline,
};
