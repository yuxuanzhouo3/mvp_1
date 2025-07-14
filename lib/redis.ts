import { Redis } from '@upstash/redis'

if (!process.env.UPSTASH_REDIS_URL || !process.env.UPSTASH_REDIS_TOKEN) {
  throw new Error('Missing Upstash Redis environment variables')
}

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
})

// 常用 Redis 操作封装
export const redisUtils = {
  // 设置缓存
  async set(key: string, value: any, ttl?: number) {
    if (ttl) {
      return await redis.set(key, JSON.stringify(value), { ex: ttl })
    }
    return await redis.set(key, JSON.stringify(value))
  },

  // 获取缓存
  async get<T>(key: string): Promise<T | null> {
    const value = await redis.get(key)
    if (!value) return null
    try {
      return JSON.parse(value as string) as T
    } catch {
      return value as T
    }
  },

  // 删除缓存
  async del(key: string) {
    return await redis.del(key)
  },

  // 检查键是否存在
  async exists(key: string) {
    return await redis.exists(key)
  },

  // 设置过期时间
  async expire(key: string, seconds: number) {
    return await redis.expire(key, seconds)
  },

  // 获取剩余过期时间
  async ttl(key: string) {
    return await redis.ttl(key)
  },

  // 列表操作
  async lpush(key: string, value: any) {
    return await redis.lpush(key, JSON.stringify(value))
  },

  async rpop(key: string) {
    const value = await redis.rpop(key)
    if (!value) return null
    try {
      return JSON.parse(value as string)
    } catch {
      return value
    }
  },

  // 哈希操作
  async hset(key: string, field: string, value: any) {
    return await redis.hset(key, field, JSON.stringify(value))
  },

  async hget<T>(key: string, field: string): Promise<T | null> {
    const value = await redis.hget(key, field)
    if (!value) return null
    try {
      return JSON.parse(value as string) as T
    } catch {
      return value as T
    }
  },

  // 计数器
  async incr(key: string) {
    return await redis.incr(key)
  },

  async decr(key: string) {
    return await redis.decr(key)
  }
} 