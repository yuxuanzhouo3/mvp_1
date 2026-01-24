import { Redis } from '@upstash/redis';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAtMs: number;
  limit: number;
}

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  const url = (process.env.UPSTASH_REDIS_URL || '').trim();
  const token = (process.env.UPSTASH_REDIS_TOKEN || '').trim();

  if (!url || !token) {
    return null;
  }

  try {
    redis = new Redis({ url, token });
    return redis;
  } catch {
    return null;
  }
}

export function getRequestIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = request.headers.get('x-real-ip')?.trim();
  return forwarded || realIp || null;
}

export async function rateLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  const client = getRedis();
  const now = Date.now();

  if (!client) {
    return { allowed: true, remaining: params.limit, resetAtMs: now + params.windowMs, limit: params.limit };
  }

  const windowStart = now - params.windowMs;
  const member = `${now}:${Math.random().toString(36).slice(2)}`;

  try {
    await client.zremrangebyscore(params.key, 0, windowStart);
    await client.zadd(params.key, { score: now, member });
    const count = await client.zcard(params.key);
    await client.expire(params.key, Math.ceil((params.windowMs + 1000) / 1000));

    const remaining = Math.max(0, params.limit - count);
    return { allowed: count <= params.limit, remaining, resetAtMs: now + params.windowMs, limit: params.limit };
  } catch {
    return { allowed: true, remaining: params.limit, resetAtMs: now + params.windowMs, limit: params.limit };
  }
}
