type PlatformCertCacheEntry = {
  publicKeyPem: string;
  expireAtMs: number;
};

const certCache = new Map<string, PlatformCertCacheEntry>();
let refreshInFlight: Promise<void> | null = null;

function normalizePrivateKey(privateKey: string): string {
  const raw = (privateKey || '').replace(/\\n/g, '\n').trim();
  if (!raw) return '';
  if (raw.includes('-----BEGIN')) return raw;
  const cleanKey = raw.replace(/\s/g, '');
  const lines: string[] = [];
  for (let i = 0; i < cleanKey.length; i += 64) {
    lines.push(cleanKey.substring(i, i + 64));
  }
  return `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----`;
}

function assertApiV3Key(): string {
  const apiV3Key = process.env.WECHAT_PAY_API_V3_KEY || '';
  const keyBytes = Buffer.from(apiV3Key, 'utf8');
  if (keyBytes.length !== 32) {
    throw new Error('WECHAT_PAY_API_V3_KEY must be 32 bytes');
  }
  return apiV3Key;
}

function decryptCertificate(encrypted: {
  algorithm: string;
  ciphertext: string;
  associated_data: string;
  nonce: string;
}): string {
  const apiV3Key = assertApiV3Key();

  if (encrypted.algorithm !== 'AEAD_AES_256_GCM') {
    throw new Error(`Unsupported algorithm: ${encrypted.algorithm}`);
  }

  const crypto = require('crypto');
  const key = Buffer.from(apiV3Key, 'utf8');
  const nonce = Buffer.from(encrypted.nonce, 'utf8');
  const ciphertext = Buffer.from(encrypted.ciphertext, 'base64');
  const associatedData = Buffer.from(encrypted.associated_data || '', 'utf8');

  const authTag = ciphertext.slice(-16);
  const data = ciphertext.slice(0, -16);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);
  decipher.setAuthTag(authTag);
  decipher.setAAD(associatedData);

  let decrypted = decipher.update(data, undefined, 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function buildWeChatV3Authorization(method: 'GET' | 'POST', urlPath: string, body: string) {
  const mchId = process.env.WECHAT_PAY_MCHID || '';
  const serialNo = process.env.WECHAT_PAY_SERIAL_NO || '';
  const privateKey = normalizePrivateKey(process.env.WECHAT_PAY_PRIVATE_KEY || '');

  if (!mchId || !serialNo || !privateKey) {
    throw new Error('Missing WeChat Pay merchant configuration');
  }

  const crypto = require('crypto');
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = crypto.randomBytes(16).toString('hex');
  const signMessage = `${method}\n${urlPath}\n${timestamp}\n${nonceStr}\n${body}\n`;

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signMessage);
  sign.end();
  const signature = sign.sign(privateKey, 'base64');

  const authorization = `WECHATPAY2-SHA256-RSA2048 mchid="${mchId}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${serialNo}"`;
  return { authorization };
}

async function refreshPlatformCertificates(): Promise<void> {
  const urlPath = '/v3/certificates';
  const { authorization } = buildWeChatV3Authorization('GET', urlPath, '');

  const response = await fetch(`https://api.mch.weixin.qq.com${urlPath}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: authorization,
    },
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`WeChat platform certificates fetch failed: ${response.status}`);
  }

  const list: any[] = Array.isArray(payload?.data) ? payload.data : [];
  const crypto = require('crypto');

  for (const item of list) {
    const serial = item?.serial_no;
    const encrypted = item?.encrypt_certificate;
    if (!serial || !encrypted) continue;

    const certPem = decryptCertificate(encrypted);
    const x509 = new crypto.X509Certificate(certPem);
    const exported = x509.publicKey.export({ type: 'spki', format: 'pem' });
    const publicKeyPem = typeof exported === 'string' ? exported : exported.toString('utf8');

    const expireTime = item?.expire_time ? new Date(item.expire_time).getTime() : 0;
    const expireAtMs = Number.isFinite(expireTime) && expireTime > 0 ? expireTime : Date.now() + 12 * 60 * 60 * 1000;
    certCache.set(serial, { publicKeyPem, expireAtMs });
  }
}

export async function getWeChatPlatformPublicKeyPem(serial: string): Promise<string | null> {
  const cached = certCache.get(serial);
  if (cached && Date.now() < cached.expireAtMs - 60_000) {
    return cached.publicKeyPem;
  }

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        await refreshPlatformCertificates();
      } finally {
        refreshInFlight = null;
      }
    })();
  }

  await refreshInFlight;

  const refreshed = certCache.get(serial);
  if (refreshed && Date.now() < refreshed.expireAtMs - 60_000) {
    return refreshed.publicKeyPem;
  }

  return null;
}

