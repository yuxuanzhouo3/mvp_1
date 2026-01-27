import { logger } from '@/lib/logger';

export async function sendAlert(params: { title: string; message: string; metadata?: Record<string, unknown> }) {
  const url = (process.env.ALERT_WEBHOOK_URL || '').trim();
  if (!url) return;

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: params.title,
        message: params.message,
        metadata: params.metadata || {},
        occurred_at: new Date().toISOString(),
      }),
    });
  } catch (err) {
    logger.warn('Alert', 'sendAlert_failed', {
      title: params.title,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

