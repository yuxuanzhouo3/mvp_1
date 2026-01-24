import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  const url = (process.env.UPSTASH_REDIS_URL || '').trim();
  const token = (process.env.UPSTASH_REDIS_TOKEN || '').trim();
  if (!url || !token) return null;

  try {
    redis = new Redis({ url, token });
    return redis;
  } catch {
    return null;
  }
}

export async function markWebhookEventOnce(params: {
  provider: 'stripe' | 'paypal';
  eventId: string;
  ttlSeconds?: number;
}): Promise<{ isFirst: boolean; dedupeEnabled: boolean }> {
  const client = getRedis();
  if (!client) {
    return { isFirst: true, dedupeEnabled: false };
  }

  const ttlSeconds = Math.max(60, Math.floor(params.ttlSeconds ?? 7 * 24 * 60 * 60));
  const key = `wh:${params.provider}:event:${params.eventId}`;

  try {
    const result = await client.set(key, '1', { nx: true, ex: ttlSeconds });
    return { isFirst: result === 'OK', dedupeEnabled: true };
  } catch {
    return { isFirst: true, dedupeEnabled: true };
  }
}

