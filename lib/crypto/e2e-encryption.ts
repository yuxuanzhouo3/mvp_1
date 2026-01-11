/**
 * 端到端加密工具 (E2EE)
 * 使用 Web Crypto API 实现基于 ECDH 的密钥交换和 AES-GCM 加密
 * 
 * 注意：这是一个简化的实现，生产环境建议使用 Signal Protocol 等成熟方案
 */

// 加密配置
const CRYPTO_CONFIG = {
  // ECDH 密钥交换参数
  ECDH: {
    name: 'ECDH',
    namedCurve: 'P-256',
  },
  // AES-GCM 对称加密参数
  AES: {
    name: 'AES-GCM',
    length: 256,
  },
  // IV 长度（字节）
  IV_LENGTH: 12,
  // Salt 长度（字节）
  SALT_LENGTH: 16,
};

export interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface ExportedPublicKey {
  x: string;
  y: string;
}

export interface EncryptedMessage {
  ciphertext: string;
  iv: string;
  salt: string;
}

/**
 * 生成 ECDH 密钥对
 */
export async function generateKeyPair(): Promise<KeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    CRYPTO_CONFIG.ECDH,
    true, // extractable
    ['deriveKey', 'deriveBits']
  );

  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
  };
}

/**
 * 导出公钥为可传输格式
 */
export async function exportPublicKey(publicKey: CryptoKey): Promise<ExportedPublicKey> {
  const exported = await crypto.subtle.exportKey('jwk', publicKey);
  
  if (!exported.x || !exported.y) {
    throw new Error('Failed to export public key');
  }

  return {
    x: exported.x,
    y: exported.y,
  };
}

/**
 * 导入公钥
 */
export async function importPublicKey(exported: ExportedPublicKey): Promise<CryptoKey> {
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    x: exported.x,
    y: exported.y,
  };

  return await crypto.subtle.importKey(
    'jwk',
    jwk,
    CRYPTO_CONFIG.ECDH,
    true,
    []
  );
}

/**
 * 导出私钥（仅用于本地存储）
 */
export async function exportPrivateKey(privateKey: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('jwk', privateKey);
  return JSON.stringify(exported);
}

/**
 * 导入私钥
 */
export async function importPrivateKey(exportedJson: string): Promise<CryptoKey> {
  const jwk = JSON.parse(exportedJson);
  
  return await crypto.subtle.importKey(
    'jwk',
    jwk,
    CRYPTO_CONFIG.ECDH,
    true,
    ['deriveKey', 'deriveBits']
  );
}

/**
 * 使用 ECDH 派生共享密钥
 */
export async function deriveSharedKey(
  privateKey: CryptoKey,
  publicKey: CryptoKey,
  salt: Uint8Array
): Promise<CryptoKey> {
  // 首先派生共享密钥材料
  const sharedBits = await crypto.subtle.deriveBits(
    {
      name: 'ECDH',
      public: publicKey,
    },
    privateKey,
    256
  );

  // 使用 HKDF 派生最终密钥
  const sharedKeyMaterial = await crypto.subtle.importKey(
    'raw',
    sharedBits,
    'HKDF',
    false,
    ['deriveKey']
  );

  // 派生 AES 密钥
  return await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt,
      info: new TextEncoder().encode('PersonaLink E2E Chat'),
    },
    sharedKeyMaterial,
    CRYPTO_CONFIG.AES,
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * 加密消息
 */
export async function encryptMessage(
  message: string,
  sharedKey: CryptoKey
): Promise<EncryptedMessage> {
  // 生成随机 IV
  const iv = crypto.getRandomValues(new Uint8Array(CRYPTO_CONFIG.IV_LENGTH));
  
  // 编码消息
  const encodedMessage = new TextEncoder().encode(message);
  
  // 加密
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    sharedKey,
    encodedMessage
  );

  // 转换为 Base64
  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv),
    salt: '', // Salt 在密钥派生时使用，这里不需要
  };
}

/**
 * 解密消息
 */
export async function decryptMessage(
  encrypted: EncryptedMessage,
  sharedKey: CryptoKey
): Promise<string> {
  // 解码 Base64
  const ciphertext = base64ToArrayBuffer(encrypted.ciphertext);
  const iv = base64ToArrayBuffer(encrypted.iv);

  // 解密
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    sharedKey,
    ciphertext
  );

  // 解码消息
  return new TextDecoder().decode(decrypted);
}

/**
 * 生成随机 Salt
 */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(CRYPTO_CONFIG.SALT_LENGTH));
}

/**
 * ArrayBuffer 转 Base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Base64 转 ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * 密钥管理器类
 * 管理本地密钥的存储和加载
 */
export class KeyManager {
  private static readonly STORAGE_KEY = 'personalink_e2e_keypair';
  private keyPair: KeyPair | null = null;

  /**
   * 初始化密钥管理器
   */
  async initialize(): Promise<KeyPair> {
    // 尝试从本地存储加载
    const stored = localStorage.getItem(KeyManager.STORAGE_KEY);
    
    if (stored) {
      try {
        const { publicKey, privateKey } = JSON.parse(stored);
        this.keyPair = {
          publicKey: await importPublicKey(publicKey),
          privateKey: await importPrivateKey(privateKey),
        };
        return this.keyPair;
      } catch (err) {
        console.error('Failed to load stored keys:', err);
        // 如果加载失败，生成新密钥
      }
    }

    // 生成新密钥对
    this.keyPair = await generateKeyPair();
    
    // 保存到本地存储
    await this.saveKeys();
    
    return this.keyPair;
  }

  /**
   * 保存密钥到本地存储
   */
  private async saveKeys(): Promise<void> {
    if (!this.keyPair) return;

    const exported = {
      publicKey: await exportPublicKey(this.keyPair.publicKey),
      privateKey: await exportPrivateKey(this.keyPair.privateKey),
    };

    localStorage.setItem(KeyManager.STORAGE_KEY, JSON.stringify(exported));
  }

  /**
   * 获取当前密钥对
   */
  getKeyPair(): KeyPair | null {
    return this.keyPair;
  }

  /**
   * 获取公钥（用于分享给对方）
   */
  async getPublicKey(): Promise<ExportedPublicKey | null> {
    if (!this.keyPair) return null;
    return await exportPublicKey(this.keyPair.publicKey);
  }

  /**
   * 删除本地密钥
   */
  clearKeys(): void {
    localStorage.removeItem(KeyManager.STORAGE_KEY);
    this.keyPair = null;
  }
}

/**
 * 会话加密器类
 * 管理与特定用户的加密会话
 */
export class SessionEncryptor {
  private sharedKey: CryptoKey | null = null;
  private salt: Uint8Array;

  constructor() {
    this.salt = generateSalt();
  }

  /**
   * 使用对方公钥建立会话
   */
  async establishSession(
    myPrivateKey: CryptoKey,
    theirPublicKey: ExportedPublicKey
  ): Promise<void> {
    const publicKey = await importPublicKey(theirPublicKey);
    this.sharedKey = await deriveSharedKey(myPrivateKey, publicKey, this.salt);
  }

  /**
   * 加密消息
   */
  async encrypt(message: string): Promise<EncryptedMessage> {
    if (!this.sharedKey) {
      throw new Error('Session not established');
    }
    const encrypted = await encryptMessage(message, this.sharedKey);
    encrypted.salt = arrayBufferToBase64(this.salt);
    return encrypted;
  }

  /**
   * 解密消息
   */
  async decrypt(encrypted: EncryptedMessage): Promise<string> {
    if (!this.sharedKey) {
      throw new Error('Session not established');
    }
    return await decryptMessage(encrypted, this.sharedKey);
  }

  /**
   * 检查会话是否已建立
   */
  isEstablished(): boolean {
    return this.sharedKey !== null;
  }
}

const e2eEncryptionUtils = {
  generateKeyPair,
  exportPublicKey,
  importPublicKey,
  deriveSharedKey,
  encryptMessage,
  decryptMessage,
  generateSalt,
  KeyManager,
  SessionEncryptor,
};

export default e2eEncryptionUtils;

