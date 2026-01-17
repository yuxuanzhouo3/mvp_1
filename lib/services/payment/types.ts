/**
 * 支付服务接口类型定义
 * Payment Service Interface Types
 * 
 * 为 CN (微信支付 + 支付宝) 和 INTL (Stripe + PayPal) 环境定义统一接口
 */

// 支付方式
export type PaymentMethod =
  | 'stripe'         // INTL - 信用卡/借记卡
  | 'paypal'         // INTL - PayPal
  | 'wechat'         // CN - 微信支付
  | 'wechat_native'  // CN - 微信扫码支付
  | 'wechat_jsapi'   // CN - 微信公众号支付
  | 'wechat_h5'      // CN - 微信H5支付
  | 'alipay'         // CN - 支付宝
  | 'alipay_face'    // CN - 支付宝当面付
  | 'alipay_wap';    // CN - 支付宝手机网站支付

// 支付状态
export type PaymentStatus = 
  | 'pending'     // 待支付
  | 'processing'  // 处理中
  | 'completed'   // 已完成
  | 'failed'      // 失败
  | 'refunded'    // 已退款
  | 'cancelled';  // 已取消

// 货币类型
export type Currency = 'USD' | 'EUR' | 'CNY';

// 支付记录
export interface PaymentRecord {
  id: string;
  userId: string;
  amount: number;
  currency: Currency;
  credits: number;
  method: PaymentMethod;
  status: PaymentStatus;
  providerOrderId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

// 创建支付请求
export interface CreatePaymentRequest {
  userId: string;
  amount: number;
  currency: Currency;
  credits: number;
  method: PaymentMethod;
  packageId: string;
  returnUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, any>;
}

// 创建支付响应
export interface CreatePaymentResponse {
  success: boolean;
  paymentId?: string;
  redirectUrl?: string;      // 需要重定向的支付（Stripe, PayPal）
  qrCodeUrl?: string;        // 二维码支付（微信, 支付宝）
  qrCodeBase64?: string;     // Base64 二维码图片
  prepayId?: string;         // 微信支付预支付ID
  jsapiParams?: any;         // 微信JSAPI支付参数
  error?: string;
  errorCode?: string;
}

// 验证支付请求
export interface VerifyPaymentRequest {
  paymentId: string;
  providerOrderId?: string;
  method: PaymentMethod;
}

// 验证支付响应
export interface VerifyPaymentResponse {
  success: boolean;
  status: PaymentStatus;
  credits?: number;
  error?: string;
}

// 支付方式配置
export interface PaymentMethodConfig {
  id: PaymentMethod;
  name: string;
  description: string;
  icon: string;
  processingTime: string;
  available: boolean;
  currencies: Currency[];
}

// 积分套餐
export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  originalPrice?: number;
  currency: Currency;
  popular?: boolean;
  bestValue?: boolean;
  features: string[];
}

// 支付服务接口
export interface IPaymentService {
  /**
   * 创建支付订单
   */
  createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse>;

  /**
   * 验证支付状态
   */
  verifyPayment(request: VerifyPaymentRequest): Promise<VerifyPaymentResponse>;

  /**
   * 处理支付回调/Webhook
   */
  handleCallback(method: PaymentMethod, payload: any, headers?: Record<string, string>): Promise<{
    success: boolean;
    paymentId?: string;
    status?: PaymentStatus;
    error?: string;
  }>;

  /**
   * 获取支付记录
   */
  getPaymentById(paymentId: string, userId: string): Promise<PaymentRecord | null>;

  /**
   * 获取用户支付历史
   */
  getPaymentHistory(userId: string, options?: {
    limit?: number;
    offset?: number;
    status?: PaymentStatus;
  }): Promise<PaymentRecord[]>;

  /**
   * 获取可用支付方式
   */
  getAvailablePaymentMethods(): PaymentMethodConfig[];

  /**
   * 获取积分套餐列表
   */
  getCreditPackages(): CreditPackage[];

  /**
   * 申请退款
   */
  requestRefund(paymentId: string, reason?: string): Promise<{
    success: boolean;
    error?: string;
  }>;
}

