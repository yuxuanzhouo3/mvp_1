/**
 * CN 环境支付服务实现 (微信支付 + 支付宝)
 * CN Environment Payment Service Implementation
 */

import type {
  IPaymentService,
  PaymentRecord,
  CreatePaymentRequest,
  CreatePaymentResponse,
  VerifyPaymentRequest,
  VerifyPaymentResponse,
  PaymentMethodConfig,
  CreditPackage,
  PaymentStatus,
  PaymentMethod,
} from './types';
import { getServiceDbClient } from '@/lib/db-client';

// 积分套餐配置 (CNY)
const CN_CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'starter',
    name: '入门包',
    credits: 50,
    price: 9.99,
    currency: 'CNY',
    features: ['50 积分', '基础匹配', '标准客服'],
  },
  {
    id: 'popular',
    name: '热门包',
    credits: 150,
    price: 24.99,
    originalPrice: 29.99,
    currency: 'CNY',
    popular: true,
    features: ['150 积分', '优先匹配', '优先客服', '高级筛选', '送 1 次 Boost'],
  },
  {
    id: 'premium',
    name: '高级包',
    credits: 300,
    price: 44.99,
    originalPrice: 59.99,
    currency: 'CNY',
    bestValue: true,
    features: ['300 积分', '超级匹配', '专属客服', '无限筛选', '数据分析', '送 3 天 Premium 体验'],
  },
  {
    id: 'ultimate',
    name: '终极包',
    credits: 500,
    price: 69.99,
    originalPrice: 99.99,
    currency: 'CNY',
    features: ['500 积分', 'VIP 匹配', '24/7 客服', '所有功能', '专属活动', '送 7 天 VIP 体验'],
  },
];

/**
 * 规范化私钥字符串
 * 处理环境变量中各种形式的换行符：
 * - \\n (字面量反斜杠n)
 * - \n (转义的换行符)
 * - 实际的换行符
 * - 引号包裹的情况
 */
function normalizePrivateKey(key: string): string {
  if (!key) return '';
  
  let normalized = key
    // 移除首尾引号
    .replace(/^["']|["']$/g, '')
    // 处理字面量 \\n（在某些环境变量配置中）
    .replace(/\\\\n/g, '\n')
    // 处理转义的 \n
    .replace(/\\n/g, '\n')
    // 处理 Windows 风格换行符
    .replace(/\r\n/g, '\n')
    .trim();
  
  return normalized;
}

/**
 * 生成随机字符串
 */
function generateNonceStr(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function formatPem(label: 'PRIVATE KEY' | 'RSA PRIVATE KEY', base64Body: string): string {
  const normalized = base64Body.replace(/[\r\n\s]/g, '');
  const lines = normalized.match(/.{1,64}/g) || [];
  return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----\n`;
}

function createRsaPrivateKey(privateKey: string) {
  const crypto = require('crypto');
  const trimmed = (privateKey || '')
    .trim()
    .replace(/^"+|"+$/g, '')
    .replace(/\\n/g, '\n')
    .trim();

  if (!trimmed) {
    throw new Error('Missing private key');
  }

  if (trimmed.includes('-----BEGIN')) {
    return crypto.createPrivateKey(trimmed);
  }

  const base64 = trimmed.replace(/[\r\n\s]/g, '');
  const der = Buffer.from(base64, 'base64');

  try {
    return crypto.createPrivateKey({ key: der, format: 'der', type: 'pkcs8' });
  } catch {}

  try {
    return crypto.createPrivateKey({ key: der, format: 'der', type: 'pkcs1' });
  } catch {}

  try {
    return crypto.createPrivateKey(formatPem('PRIVATE KEY', base64));
  } catch {}

  return crypto.createPrivateKey(formatPem('RSA PRIVATE KEY', base64));
}

/**
 * 微信支付 V3 RSA-SHA256 签名
 * @param message 待签名字符串
 * @param privateKey 商户私钥 (PEM 格式)
 */
async function generateWeChatV3Signature(message: string, privateKey: string): Promise<string> {
  const crypto = require('crypto');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(message);
  sign.end();
  
  const keyObject = createRsaPrivateKey(privateKey);
  const signature = sign.sign(keyObject, 'base64');
  return signature;
}

/**
 * 构建微信支付 V3 Authorization 头
 */
function buildWeChatV3Authorization(
  mchId: string,
  serialNo: string,
  nonceStr: string,
  timestamp: string,
  signature: string
): string {
  return `WECHATPAY2-SHA256-RSA2048 mchid="${mchId}",nonce_str="${nonceStr}",timestamp="${timestamp}",serial_no="${serialNo}",signature="${signature}"`;
}

/**
 * 构建微信支付 V3 签名字符串
 */
function buildWeChatV3SignMessage(
  method: string,
  url: string,
  timestamp: string,
  nonceStr: string,
  body: string
): string {
  return `${method}\n${url}\n${timestamp}\n${nonceStr}\n${body}\n`;
}

/**
 * 生成支付宝签名 (RSA2 = RSA-SHA256)
 */
async function generateAlipaySign(params: Record<string, string>, privateKey: string): Promise<string> {
  const crypto = require('crypto');

  // 1. 排序参数并构建待签名字符串
  const sortedKeys = Object.keys(params).filter(key => key !== 'sign').sort();
  const signContent = sortedKeys.map(key => `${key}=${params[key]}`).join('&');

  const keyObject = createRsaPrivateKey(privateKey);
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signContent, 'utf8');
  sign.end();

  const signature = sign.sign(keyObject, 'base64');
  return signature;
}

// 支付类型
type WeChatPayType = 'NATIVE' | 'JSAPI' | 'H5' | 'APP' | 'MWEB';
type AlipayPayType = 'pc' | 'wap' | 'app';

/**
 * CN 支付服务 - 微信支付 V3 + 支付宝
 */
export class CnPaymentService implements IPaymentService {
  // 微信支付 V3 配置
  private wechatMchId: string;
  private wechatApiKey: string;        // V3 API 密钥
  private wechatCertSerialNo: string;  // 证书序列号
  private wechatPrivateKey: string;    // 商户私钥
  private wechatNotifyUrl: string;     // 回调地址
  private wechatPayAppId: string;      // 支付用 AppID（公众号/小程序，与商户号关联）
  // 支付宝配置
  private alipayAppId: string;
  private alipayPrivateKey: string;
  private alipayGatewayUrl: string;
  // 通用配置
  private apiBaseUrl: string;

  constructor() {
    // 微信支付 V3 配置
    this.wechatMchId = process.env.WECHAT_PAY_MCH_ID || '';
    this.wechatApiKey = process.env.WECHAT_PAY_API_KEY || '';
    this.wechatCertSerialNo = process.env.WECHAT_PAY_CERT_SERIAL_NO || '';
    // 处理私钥中的换行符：支持 \n 转义、\\n 字面量、以及实际换行
    this.wechatPrivateKey = normalizePrivateKey(process.env.WECHAT_PAY_PRIVATE_KEY || '');
    this.wechatNotifyUrl = process.env.WECHAT_PAY_NOTIFY_URL || '';
    // 支付用 AppID - 优先使用专门的支付 AppID，否则回退到通用配置
    // 注意：微信支付需要的是与商户号关联的公众号/小程序 AppID，不是开放平台的网站应用 AppID
    this.wechatPayAppId = 
      process.env.WECHAT_PAY_APP_ID ||      // 专门用于支付的 AppID（推荐）
      process.env.WECHAT_APP_ID ||          // 通用微信 AppID
      '';
    // 支付宝配置
    this.alipayAppId = process.env.ALIPAY_APP_ID || '';
    // 处理支付宝私钥中的换行符
    this.alipayPrivateKey = normalizePrivateKey(process.env.ALIPAY_PRIVATE_KEY || '');
    this.alipayGatewayUrl =
      process.env.ALIPAY_GATEWAY_URL ||
      process.env.ALIPAY_NOTIFY_URL ||
      'https://openapi.alipay.com/gateway.do';
    // 通用配置
    this.apiBaseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  }

  async createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse> {
    const { method } = request;

    switch (method) {
      case 'wechat':
        return this.createWeChatPayment(request);
      case 'wechat_native':
        return this.createWeChatPayment({ ...request, method: 'wechat' });
      case 'wechat_jsapi':
        return this.createWeChatJSAPIPayment(request);
      case 'wechat_h5':
        return this.createWeChatH5Payment(request);
      case 'alipay':
        return this.createAlipayPayment(request);
      case 'alipay_face':
        return this.createAlipayPayment({ ...request, method: 'alipay' });
      case 'alipay_wap':
        return this.createAlipayWapPayment(request);
      default:
        return {
          success: false,
          error: `不支持的支付方式: ${method}`,
          errorCode: 'UNSUPPORTED_METHOD',
        };
    }
  }

  /**
   * 创建微信支付订单 (V3 Native 扫码支付)
   */
  private async createWeChatPayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse> {
    try {
      // 1. 先在数据库创建支付记录
      const paymentRecord = await this.createPaymentRecord(request);

      if (!paymentRecord) {
        return {
          success: false,
          error: '创建支付记录失败',
          errorCode: 'CREATE_RECORD_FAILED',
        };
      }

      // 2. 构建 V3 API 请求
      const apiUrl = '/v3/pay/transactions/native';
      const fullUrl = `https://api.mch.weixin.qq.com${apiUrl}`;
      
      // 检查支付 AppID 是否配置
      if (!this.wechatPayAppId) {
        console.error('[WeChat Pay V3] Missing WECHAT_PAY_APP_ID or WECHAT_APP_ID');
        return {
          success: false,
          error: '微信支付 AppID 未配置，请设置 WECHAT_PAY_APP_ID 环境变量',
          errorCode: 'MISSING_APP_ID',
        };
      }

      const requestBody = {
        mchid: this.wechatMchId,
        out_trade_no: paymentRecord.id,
        appid: this.wechatPayAppId, // 与商户号关联的公众号/小程序 AppID
        description: `PersonaLink - ${request.credits}积分`,
        notify_url: this.wechatNotifyUrl || `${this.apiBaseUrl}/api/payments/wechat-callback`,
        amount: {
          total: Math.round(request.amount * 100), // 单位：分
          currency: 'CNY',
        },
      };
      
      console.log('[WeChat Pay V3] Creating payment with appid:', this.wechatPayAppId, 'mchid:', this.wechatMchId);

      const bodyStr = JSON.stringify(requestBody);
      
      // 3. 生成签名
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonceStr = generateNonceStr();
      const signMessage = buildWeChatV3SignMessage('POST', apiUrl, timestamp, nonceStr, bodyStr);
      const signature = await generateWeChatV3Signature(signMessage, this.wechatPrivateKey);
      
      // 4. 构建 Authorization 头
      const authorization = buildWeChatV3Authorization(
        this.wechatMchId,
        this.wechatCertSerialNo,
        nonceStr,
        timestamp,
        signature
      );

      // 5. 调用微信支付 V3 API
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': authorization,
        },
        body: bodyStr,
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('[WeChat Pay V3] Error:', result);
        return {
          success: false,
          error: result.message || '微信支付创建失败',
          errorCode: result.code || 'WECHAT_ERROR',
        };
      }

      return {
        success: true,
        paymentId: paymentRecord.id,
        qrCodeUrl: result.code_url,
      };
    } catch (error: any) {
      console.error('[WeChat Pay V3] Create payment error:', error);
      return {
        success: false,
        error: error.message || '微信支付创建失败',
        errorCode: 'WECHAT_ERROR',
      };
    }
  }

  /**
   * 创建微信 JSAPI 支付订单 (V3 API)
   * 需要用户的 openid
   */
  private async createWeChatJSAPIPayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse> {
    try {
      const { openid } = request.metadata || {};
      
      if (!openid) {
        return {
          success: false,
          error: '缺少用户 openid，请先完成微信授权',
          errorCode: 'MISSING_OPENID',
        };
      }

      // 1. 创建支付记录
      const paymentRecord = await this.createPaymentRecord({
        ...request,
        method: 'wechat_jsapi',
      });

      if (!paymentRecord) {
        return {
          success: false,
          error: '创建支付记录失败',
          errorCode: 'CREATE_RECORD_FAILED',
        };
      }

      // 2. 构建 V3 API 请求
      const apiUrl = '/v3/pay/transactions/jsapi';
      const fullUrl = `https://api.mch.weixin.qq.com${apiUrl}`;
      
      if (!this.wechatPayAppId) {
        return {
          success: false,
          error: '微信支付 AppID 未配置',
          errorCode: 'MISSING_APP_ID',
        };
      }
      
      const requestBody = {
        mchid: this.wechatMchId,
        out_trade_no: paymentRecord.id,
        appid: this.wechatPayAppId,
        description: `PersonaLink - ${request.credits}积分`,
        notify_url: this.wechatNotifyUrl || `${this.apiBaseUrl}/api/payments/wechat-callback`,
        amount: {
          total: Math.round(request.amount * 100),
          currency: 'CNY',
        },
        payer: {
          openid: openid,
        },
      };

      const bodyStr = JSON.stringify(requestBody);
      
      // 3. 生成签名
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonceStr = generateNonceStr();
      const signMessage = buildWeChatV3SignMessage('POST', apiUrl, timestamp, nonceStr, bodyStr);
      const signature = await generateWeChatV3Signature(signMessage, this.wechatPrivateKey);
      
      const authorization = buildWeChatV3Authorization(
        this.wechatMchId,
        this.wechatCertSerialNo,
        nonceStr,
        timestamp,
        signature
      );

      // 4. 调用 API
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': authorization,
        },
        body: bodyStr,
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('[WeChat JSAPI V3] Error:', result);
        return {
          success: false,
          error: result.message || '微信支付创建失败',
          errorCode: result.code || 'WECHAT_JSAPI_ERROR',
        };
      }

      // 5. 生成前端调起支付所需的参数 (需要重新签名)
      const jsTimestamp = Math.floor(Date.now() / 1000).toString();
      const jsNonceStr = generateNonceStr();
      const packageStr = `prepay_id=${result.prepay_id}`;
      const jsSignMessage = `${this.wechatPayAppId}\n${jsTimestamp}\n${jsNonceStr}\n${packageStr}\n`;
      const jsSignature = await generateWeChatV3Signature(jsSignMessage, this.wechatPrivateKey);

      const jsapiParams = {
        appId: this.wechatPayAppId,
        timeStamp: jsTimestamp,
        nonceStr: jsNonceStr,
        package: packageStr,
        signType: 'RSA',
        paySign: jsSignature,
      };

      return {
        success: true,
        paymentId: paymentRecord.id,
        prepayId: result.prepay_id,
        jsapiParams,
      };
    } catch (error: any) {
      console.error('[WeChat JSAPI V3] Create payment error:', error);
      return {
        success: false,
        error: error.message || '微信支付创建失败',
        errorCode: 'WECHAT_JSAPI_ERROR',
      };
    }
  }

  /**
   * 创建微信 H5 支付订单 (V3 API)
   */
  private async createWeChatH5Payment(request: CreatePaymentRequest): Promise<CreatePaymentResponse> {
    try {
      // 1. 创建支付记录
      const paymentRecord = await this.createPaymentRecord({
        ...request,
        method: 'wechat_h5',
      });

      if (!paymentRecord) {
        return {
          success: false,
          error: '创建支付记录失败',
          errorCode: 'CREATE_RECORD_FAILED',
        };
      }

      // 2. 构建 V3 API 请求
      const apiUrl = '/v3/pay/transactions/h5';
      const fullUrl = `https://api.mch.weixin.qq.com${apiUrl}`;
      
      if (!this.wechatPayAppId) {
        return {
          success: false,
          error: '微信支付 AppID 未配置',
          errorCode: 'MISSING_APP_ID',
        };
      }
      
      const requestBody = {
        mchid: this.wechatMchId,
        out_trade_no: paymentRecord.id,
        appid: this.wechatPayAppId,
        description: `PersonaLink - ${request.credits}积分`,
        notify_url: this.wechatNotifyUrl || `${this.apiBaseUrl}/api/payments/wechat-callback`,
        amount: {
          total: Math.round(request.amount * 100),
          currency: 'CNY',
        },
        scene_info: {
          payer_client_ip: request.metadata?.clientIp || '127.0.0.1',
          h5_info: {
            type: 'Wap',
            app_name: 'PersonaLink',
            app_url: this.apiBaseUrl,
          },
        },
      };

      const bodyStr = JSON.stringify(requestBody);
      
      // 3. 生成签名
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonceStr = generateNonceStr();
      const signMessage = buildWeChatV3SignMessage('POST', apiUrl, timestamp, nonceStr, bodyStr);
      const signature = await generateWeChatV3Signature(signMessage, this.wechatPrivateKey);
      
      const authorization = buildWeChatV3Authorization(
        this.wechatMchId,
        this.wechatCertSerialNo,
        nonceStr,
        timestamp,
        signature
      );

      // 4. 调用 API
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': authorization,
        },
        body: bodyStr,
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('[WeChat H5 V3] Error:', result);
        return {
          success: false,
          error: result.message || '微信H5支付创建失败',
          errorCode: result.code || 'WECHAT_H5_ERROR',
        };
      }

      // 添加回调地址
      const h5Url = new URL(result.h5_url);
      h5Url.searchParams.set('redirect_url', encodeURIComponent(`${this.apiBaseUrl}/payment/success?id=${paymentRecord.id}`));

      return {
        success: true,
        paymentId: paymentRecord.id,
        redirectUrl: h5Url.toString(),
      };
    } catch (error: any) {
      console.error('[WeChat H5 V3] Create payment error:', error);
      return {
        success: false,
        error: error.message || '微信H5支付创建失败',
        errorCode: 'WECHAT_H5_ERROR',
      };
    }
  }

  /**
   * 创建支付宝订单
   */
  private async createAlipayPayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse> {
    try {
      // 1. 先在数据库创建支付记录
      const paymentRecord = await this.createPaymentRecord(request);

      if (!paymentRecord) {
        return {
          success: false,
          error: '创建支付记录失败',
          errorCode: 'CREATE_RECORD_FAILED',
        };
      }

      // 2. 构建支付宝请求参数
      const bizContent = {
        out_trade_no: paymentRecord.id,
        total_amount: request.amount.toFixed(2),
        subject: `PersonaLink - ${request.credits}积分`,
        product_code: 'FAST_INSTANT_TRADE_PAY',
      };

      const baseUrl =
        typeof request.metadata?.origin === 'string' && request.metadata.origin
          ? request.metadata.origin
          : this.apiBaseUrl;

      const returnUrlObj = new URL(request.returnUrl || '/payment/success', baseUrl);
      returnUrlObj.searchParams.set('paymentId', paymentRecord.id);
      returnUrlObj.searchParams.set('provider', 'alipay');
      const returnUrl = returnUrlObj.toString();

      const params: Record<string, string> = {
        app_id: this.alipayAppId,
        method: 'alipay.trade.page.pay',
        format: 'JSON',
        return_url: returnUrl,
        charset: 'utf-8',
        sign_type: 'RSA2',
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        version: '1.0',
        notify_url: new URL('/api/payments/alipay-callback', baseUrl).toString(),
        biz_content: JSON.stringify(bizContent),
      };

      // 生成签名
      params.sign = await generateAlipaySign(params, this.alipayPrivateKey);

      const searchParams = new URLSearchParams(params);
      const payUrl = `${this.alipayGatewayUrl}?${searchParams.toString()}`;

      return {
        success: true,
        paymentId: paymentRecord.id,
        redirectUrl: payUrl,
      };
    } catch (error: any) {
      console.error('[Alipay] Create payment error:', error);
      return {
        success: false,
        error: error.message || '支付宝支付创建失败',
        errorCode: 'ALIPAY_ERROR',
      };
    }
  }

  /**
   * 创建支付宝手机网站支付订单
   */
  private async createAlipayWapPayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse> {
    try {
      // 1. 创建支付记录
      const paymentRecord = await this.createPaymentRecord({
        ...request,
        method: 'alipay_wap',
      });

      if (!paymentRecord) {
        return {
          success: false,
          error: '创建支付记录失败',
          errorCode: 'CREATE_RECORD_FAILED',
        };
      }

      // 2. 构建支付宝请求参数
      const baseUrl =
        typeof request.metadata?.origin === 'string' && request.metadata.origin
          ? request.metadata.origin
          : this.apiBaseUrl;

      const returnUrlObj = new URL(request.returnUrl || '/payment/success', baseUrl);
      returnUrlObj.searchParams.set('paymentId', paymentRecord.id);
      returnUrlObj.searchParams.set('provider', 'alipay');
      const returnUrl = returnUrlObj.toString();

      const cancelUrlObj = new URL(request.cancelUrl || '/payment/cancel', baseUrl);
      cancelUrlObj.searchParams.set('paymentId', paymentRecord.id);
      cancelUrlObj.searchParams.set('provider', 'alipay');
      const cancelUrl = cancelUrlObj.toString();

      const bizContent = {
        out_trade_no: paymentRecord.id,
        total_amount: request.amount.toFixed(2),
        subject: `PersonaLink - ${request.credits}积分`,
        product_code: 'QUICK_WAP_WAY', // 手机网站支付产品码
        quit_url: cancelUrl,
      };

      const params: Record<string, string> = {
        app_id: this.alipayAppId,
        method: 'alipay.trade.wap.pay',
        format: 'JSON',
        return_url: returnUrl,
        charset: 'utf-8',
        sign_type: 'RSA2',
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        version: '1.0',
        notify_url: new URL('/api/payments/alipay-callback', baseUrl).toString(),
        biz_content: JSON.stringify(bizContent),
      };

      // 生成签名
      params.sign = await generateAlipaySign(params, this.alipayPrivateKey);

      // 构建支付URL
      const searchParams = new URLSearchParams(params);
      const payUrl = `${this.alipayGatewayUrl}?${searchParams.toString()}`;

      return {
        success: true,
        paymentId: paymentRecord.id,
        redirectUrl: payUrl, // 手机网站支付需要跳转到此URL
      };
    } catch (error: any) {
      console.error('[Alipay WAP] Create payment error:', error);
      return {
        success: false,
        error: error.message || '支付宝手机网站支付创建失败',
        errorCode: 'ALIPAY_WAP_ERROR',
      };
    }
  }

  async verifyPayment(request: VerifyPaymentRequest): Promise<VerifyPaymentResponse> {
    try {
      // 从数据库获取支付记录
      const payment = await this.getPaymentById(request.paymentId, '');

      if (!payment) {
        return {
          success: false,
          status: 'failed',
          error: '支付记录不存在',
        };
      }

      return {
        success: payment.status === 'completed',
        status: payment.status,
        credits: payment.credits,
      };
    } catch (error: any) {
      return {
        success: false,
        status: 'failed',
        error: error.message || '验证支付失败',
      };
    }
  }

  async handleCallback(method: PaymentMethod, payload: any, _headers?: Record<string, string>): Promise<{
    success: boolean;
    paymentId?: string;
    status?: PaymentStatus;
    error?: string;
  }> {
    switch (method) {
      case 'wechat':
        return this.handleWeChatCallback(payload);
      case 'alipay':
        return this.handleAlipayCallback(payload);
      default:
        return {
          success: false,
          error: `不支持的支付方式: ${method}`,
        };
    }
  }

  /**
   * 处理微信支付回调
   */
  private async handleWeChatCallback(xmlPayload: string): Promise<{
    success: boolean;
    paymentId?: string;
    status?: PaymentStatus;
    error?: string;
  }> {
    try {
      const data = this.xmlToObject(xmlPayload);

      if (data.return_code !== 'SUCCESS' || data.result_code !== 'SUCCESS') {
        return {
          success: false,
          error: data.return_msg || data.err_code_des,
        };
      }

      const paymentId = data.out_trade_no;
      const status: PaymentStatus = 'completed';

      // 更新支付状态（实际实现需要调用数据库服务）
      // await this.updatePaymentStatus(paymentId, status, { wechat_transaction_id: data.transaction_id });

      return {
        success: true,
        paymentId,
        status,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '处理微信回调失败',
      };
    }
  }

  /**
   * 处理支付宝回调
   */
  private async handleAlipayCallback(payload: Record<string, string>): Promise<{
    success: boolean;
    paymentId?: string;
    status?: PaymentStatus;
    error?: string;
  }> {
    try {
      const tradeStatus = payload.trade_status;
      const paymentId = payload.out_trade_no;

      let status: PaymentStatus = 'pending';
      if (tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_FINISHED') {
        status = 'completed';
      } else if (tradeStatus === 'TRADE_CLOSED') {
        status = 'cancelled';
      }

      // 更新支付状态（实际实现需要调用数据库服务）
      // await this.updatePaymentStatus(paymentId, status, { alipay_trade_no: payload.trade_no });

      return {
        success: status === 'completed',
        paymentId,
        status,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '处理支付宝回调失败',
      };
    }
  }

  async getPaymentById(paymentId: string, userId: string): Promise<PaymentRecord | null> {
    try {
      const db = await getServiceDbClient();
      const { data, error } = await db
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        id: data.id,
        userId: data.user_id,
        amount: data.amount,
        currency: data.currency,
        credits: data.credits,
        method: data.method,
        status: data.status,
        providerOrderId: data.provider_order_id,
        metadata: data.metadata,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        completedAt: data.completed_at,
      };
    } catch (error: any) {
      console.error('[CN Payment] Get payment by ID error:', error);
      return null;
    }
  }

  async getPaymentHistory(userId: string, options?: {
    limit?: number;
    offset?: number;
    status?: PaymentStatus;
  }): Promise<PaymentRecord[]> {
    try {
      const db = await getServiceDbClient();
      let query = db
        .from('payments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error || !data) {
        return [];
      }

      return data.map((item: any) => ({
        id: item.id,
        userId: item.user_id,
        amount: item.amount,
        currency: item.currency,
        credits: item.credits,
        method: item.method,
        status: item.status,
        providerOrderId: item.provider_order_id,
        metadata: item.metadata,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        completedAt: item.completed_at,
      }));
    } catch (error: any) {
      console.error('[CN Payment] Get payment history error:', error);
      return [];
    }
  }

  getAvailablePaymentMethods(): PaymentMethodConfig[] {
    const methods: PaymentMethodConfig[] = [];
    
    // 检查微信支付 V3 配置
    const hasWeChatConfig = !!(
      this.wechatMchId && 
      this.wechatApiKey && 
      this.wechatCertSerialNo && 
      this.wechatPrivateKey
    );
    const runningOnServer = typeof window === 'undefined';
    let hasAlipayConfig = !!(this.alipayAppId && this.alipayPrivateKey);
    if (runningOnServer && hasAlipayConfig) {
      try {
        createRsaPrivateKey(this.alipayPrivateKey);
      } catch {
        hasAlipayConfig = false;
      }
    }

    // 服务器端：返回所有已配置的支付方式（客户端会根据环境选择）
    // 客户端：根据用户环境过滤支付方式
    if (runningOnServer) {
      // 服务器端：返回所有已配置的支付方式
      if (hasWeChatConfig) {
        methods.push({
          id: 'wechat',
          name: '微信支付',
          description: '使用微信扫码支付',
          icon: 'wechat',
          processingTime: '即时到账',
          available: true,
          currencies: ['CNY'],
        });
        methods.push({
          id: 'wechat_h5',
          name: '微信支付',
          description: '跳转微信支付',
          icon: 'wechat',
          processingTime: '即时到账',
          available: true,
          currencies: ['CNY'],
        });
        methods.push({
          id: 'wechat_jsapi',
          name: '微信支付',
          description: '微信内直接支付',
          icon: 'wechat',
          processingTime: '即时到账',
          available: true,
          currencies: ['CNY'],
        });
      }
      if (hasAlipayConfig) {
        methods.push({
          id: 'alipay',
          name: '支付宝',
          description: '支付宝电脑网站支付',
          icon: 'alipay',
          processingTime: '即时到账',
          available: true,
          currencies: ['CNY'],
        });
        methods.push({
          id: 'alipay_wap',
          name: '支付宝',
          description: '跳转支付宝支付',
          icon: 'alipay',
          processingTime: '即时到账',
          available: true,
          currencies: ['CNY'],
        });
      }
      return methods;
    }

    // 客户端：根据环境检测返回适合的支付方式
    const isWeChatBrowser = /micromessenger/i.test(window.navigator.userAgent);
    const isMobile = /mobile|android|iphone|ipad/i.test(window.navigator.userAgent);

    // 微信支付 - 扫码支付（PC端）
    if (hasWeChatConfig && !isMobile) {
      methods.push({
        id: 'wechat',
        name: '微信支付',
        description: '使用微信扫码支付',
        icon: 'wechat',
        processingTime: '即时到账',
        available: true,
        currencies: ['CNY'],
      });
    }

    // 微信 JSAPI 支付（微信内H5）
    if (hasWeChatConfig && isWeChatBrowser) {
      methods.push({
        id: 'wechat_jsapi',
        name: '微信支付',
        description: '微信内直接支付',
        icon: 'wechat',
        processingTime: '即时到账',
        available: true,
        currencies: ['CNY'],
      });
    }

    // 微信 H5 支付（非微信浏览器移动端）
    if (hasWeChatConfig && isMobile && !isWeChatBrowser) {
      methods.push({
        id: 'wechat_h5',
        name: '微信支付',
        description: '跳转微信支付',
        icon: 'wechat',
        processingTime: '即时到账',
        available: true,
        currencies: ['CNY'],
      });
    }

    // 支付宝 - 扫码支付（PC端）
    if (hasAlipayConfig && !isMobile) {
      methods.push({
        id: 'alipay',
        name: '支付宝',
        description: '支付宝电脑网站支付',
        icon: 'alipay',
        processingTime: '即时到账',
        available: true,
        currencies: ['CNY'],
      });
    }

    // 支付宝手机网站支付（移动端）
    if (hasAlipayConfig && isMobile) {
      methods.push({
        id: 'alipay_wap',
        name: '支付宝',
        description: '跳转支付宝支付',
        icon: 'alipay',
        processingTime: '即时到账',
        available: true,
        currencies: ['CNY'],
      });
    }

    return methods;
  }

  getCreditPackages(): CreditPackage[] {
    const raw = process.env.PAYMENT_TEST_MODE;
    const enabled =
      typeof raw === 'string' && ['true', 'ture', '1', 'yes', 'on'].includes(raw.toLowerCase());

    if (!enabled) {
      return CN_CREDIT_PACKAGES;
    }

    return [
      ...CN_CREDIT_PACKAGES,
      {
        id: 'test_0_01',
        name: '微信支付测试单',
        credits: 1,
        price: 0.01,
        currency: 'CNY',
        features: ['0.01 元', '仅用于测试'],
      },
    ];
  }

  async requestRefund(paymentId: string, reason?: string, refundAmount?: number): Promise<{
    success: boolean;
    refundId?: string;
    error?: string;
  }> {
    try {
      // 1. 获取原支付记录
      const payment = await this.getPaymentById(paymentId, '');
      
      if (!payment) {
        return {
          success: false,
          error: '支付记录不存在',
        };
      }

      if (payment.status !== 'completed') {
        return {
          success: false,
          error: '只能对已完成的订单进行退款',
        };
      }

      // 2. 根据支付方式调用不同的退款接口
      const method = payment.method;
      const actualRefundAmount = refundAmount || payment.amount;

      if (method.startsWith('wechat')) {
        return this.requestWeChatRefund(payment, actualRefundAmount, reason);
      } else if (method.startsWith('alipay')) {
        return this.requestAlipayRefund(payment, actualRefundAmount, reason);
      } else {
        return {
          success: false,
          error: `不支持的支付方式退款: ${method}`,
        };
      }
    } catch (error: any) {
      console.error('[CN Payment] Refund error:', error);
      return {
        success: false,
        error: error.message || '退款请求失败',
      };
    }
  }

  /**
   * 微信支付退款 (V3 API)
   */
  private async requestWeChatRefund(
    payment: PaymentRecord,
    refundAmount: number,
    reason?: string
  ): Promise<{ success: boolean; refundId?: string; error?: string }> {
    try {
      const refundNo = `RF_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      // V3 退款 API
      const apiUrl = '/v3/refund/domestic/refunds';
      const fullUrl = `https://api.mch.weixin.qq.com${apiUrl}`;
      
      const requestBody = {
        out_trade_no: payment.id,
        out_refund_no: refundNo,
        reason: reason || '用户申请退款',
        notify_url: `${this.apiBaseUrl}/api/payments/wechat-refund-callback`,
        amount: {
          refund: Math.round(refundAmount * 100),
          total: Math.round(payment.amount * 100),
          currency: 'CNY',
        },
      };

      const bodyStr = JSON.stringify(requestBody);
      
      // 生成签名
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonceStr = generateNonceStr();
      const signMessage = buildWeChatV3SignMessage('POST', apiUrl, timestamp, nonceStr, bodyStr);
      const signature = await generateWeChatV3Signature(signMessage, this.wechatPrivateKey);
      
      const authorization = buildWeChatV3Authorization(
        this.wechatMchId,
        this.wechatCertSerialNo,
        nonceStr,
        timestamp,
        signature
      );

      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': authorization,
        },
        body: bodyStr,
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('[WeChat Refund V3] Error:', result);
        return {
          success: false,
          error: result.message || '微信退款失败',
        };
      }

      // 更新支付记录状态
      await this.updatePaymentStatus(payment.id, 'refunded', {
        refund_id: result.refund_id,
        refund_no: refundNo,
        refund_amount: refundAmount,
        refund_reason: reason,
      });

      console.log(`[WeChat Refund V3] Refund success: ${payment.id} -> ${refundNo}`);

      return {
        success: true,
        refundId: result.refund_id,
      };
    } catch (error: any) {
      console.error('[WeChat Refund V3] Error:', error);
      return {
        success: false,
        error: error.message || '微信退款请求失败',
      };
    }
  }

  /**
   * 支付宝退款
   */
  private async requestAlipayRefund(
    payment: PaymentRecord,
    refundAmount: number,
    reason?: string
  ): Promise<{ success: boolean; refundId?: string; error?: string }> {
    try {
      const refundNo = `RF_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      const bizContent = {
        out_trade_no: payment.id,
        refund_amount: refundAmount.toFixed(2),
        refund_reason: reason || '用户申请退款',
        out_request_no: refundNo, // 部分退款时必传
      };

      const params: Record<string, string> = {
        app_id: this.alipayAppId,
        method: 'alipay.trade.refund',
        format: 'JSON',
        charset: 'utf-8',
        sign_type: 'RSA2',
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        version: '1.0',
        biz_content: JSON.stringify(bizContent),
      };

      params.sign = await generateAlipaySign(params, this.alipayPrivateKey);

      const searchParams = new URLSearchParams(params);
      const response = await fetch(`https://openapi.alipay.com/gateway.do?${searchParams.toString()}`, {
        method: 'POST',
      });

      const result = await response.json();
      const responseData = result.alipay_trade_refund_response;

      if (responseData.code !== '10000') {
        return {
          success: false,
          error: responseData.sub_msg || responseData.msg || '支付宝退款失败',
        };
      }

      // 更新支付记录状态
      await this.updatePaymentStatus(payment.id, 'refunded', {
        refund_no: refundNo,
        refund_amount: refundAmount,
        refund_reason: reason,
        alipay_trade_no: responseData.trade_no,
      });

      console.log(`[Alipay Refund] Refund success: ${payment.id} -> ${refundNo}`);

      return {
        success: true,
        refundId: refundNo,
      };
    } catch (error: any) {
      console.error('[Alipay Refund] Error:', error);
      return {
        success: false,
        error: error.message || '支付宝退款请求失败',
      };
    }
  }

  /**
   * 更新支付状态
   */
  private async updatePaymentStatus(
    paymentId: string,
    status: PaymentStatus,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const db = await getServiceDbClient();
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      if (metadata) {
        updateData.metadata = metadata;
      }

      const { error } = await db
        .from('payments')
        .update(updateData)
        .eq('id', paymentId);

      if (error) {
        console.error('[CN Payment] Update status error:', error);
      }
    } catch (error: any) {
      console.error('[CN Payment] Update status error:', error);
    }
  }

  // 辅助方法

  private objectToXml(obj: Record<string, string>): string {
    let xml = '<xml>';
    for (const [key, value] of Object.entries(obj)) {
      xml += `<${key}><![CDATA[${value}]]></${key}>`;
    }
    xml += '</xml>';
    return xml;
  }

  private xmlToObject(xml: string): Record<string, string> {
    const result: Record<string, string> = {};
    const regex = /<(\w+)><!\[CDATA\[(.*?)\]\]><\/\1>/g;
    let match;
    while ((match = regex.exec(xml)) !== null) {
      result[match[1]] = match[2];
    }
    return result;
  }

  private async createPaymentRecord(request: CreatePaymentRequest): Promise<PaymentRecord | null> {
    try {
      const db = await getServiceDbClient();
      const id = `PAY_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      const paymentData = {
        id,
        user_id: request.userId,
        amount: request.amount,
        currency: request.currency,
        credits: request.credits,
        method: request.method,
        status: 'pending' as PaymentStatus,
        metadata: request.metadata || {},
      };

      const { data, error } = await db
        .from('payments')
        .insert(paymentData)
        .select()
        .single();

      if (error || !data) {
        console.error('[CN Payment] Create payment record error:', error);
        return null;
      }

      return {
        id: data.id,
        userId: data.user_id,
        amount: data.amount,
        currency: data.currency,
        credits: data.credits,
        method: data.method,
        status: data.status,
        providerOrderId: data.provider_order_id,
        metadata: data.metadata,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        completedAt: data.completed_at,
      };
    } catch (error: any) {
      console.error('[CN Payment] Create payment record error:', error);
      return null;
    }
  }
}
