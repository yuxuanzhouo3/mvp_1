/**
 * 认证服务接口类型定义
 * Authentication Service Interface Types
 * 
 * 为 CN (微信登录) 和 INTL (Google 登录) 环境定义统一接口
 */

// 用户信息
export interface AuthUser {
  id: string;
  email?: string;
  phone?: string;
  displayName?: string;
  avatarUrl?: string;
  provider: 'email' | 'google' | 'wechat' | 'phone';
  metadata?: Record<string, any>;
}

// 登录凭证
export interface AuthCredentials {
  email?: string;
  password?: string;
  phone?: string;
  verificationCode?: string;
  // OAuth 相关
  provider?: 'google' | 'wechat';
  oauthCode?: string;
  redirectUrl?: string;
}

// 注册数据
export interface RegisterData {
  email: string;
  password: string;
  displayName?: string;
  phone?: string;
}

// 认证结果
export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  session?: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number;
  };
  error?: string;
  errorCode?: string;
}

// 第三方登录提供商配置
export interface OAuthProviderConfig {
  id: string;
  name: string;
  icon: string;
  available: boolean;
}

// 认证服务接口
export interface IAuthService {
  /**
   * 邮箱密码登录
   */
  signInWithEmail(email: string, password: string): Promise<AuthResult>;

  /**
   * 邮箱注册
   */
  signUpWithEmail(data: RegisterData): Promise<AuthResult>;

  /**
   * 第三方登录（Google/微信）
   */
  signInWithOAuth(provider: 'google' | 'wechat', redirectUrl?: string): Promise<AuthResult>;

  /**
   * 处理 OAuth 回调
   */
  handleOAuthCallback(provider: 'google' | 'wechat', code: string): Promise<AuthResult>;

  /**
   * 手机号登录（发送验证码）
   */
  sendPhoneVerificationCode?(phone: string): Promise<{ success: boolean; error?: string }>;

  /**
   * 手机号登录（验证码验证）
   */
  signInWithPhone?(phone: string, code: string): Promise<AuthResult>;

  /**
   * 退出登录
   */
  signOut(): Promise<{ success: boolean; error?: string }>;

  /**
   * 获取当前用户
   */
  getCurrentUser(): Promise<AuthUser | null>;

  /**
   * 获取当前会话
   */
  getSession(): Promise<{ accessToken: string; refreshToken?: string } | null>;

  /**
   * 刷新会话
   */
  refreshSession(): Promise<AuthResult>;

  /**
   * 重置密码（发送邮件）
   */
  resetPassword(email: string): Promise<{ success: boolean; error?: string }>;

  /**
   * 更新密码
   */
  updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }>;

  /**
   * 获取可用的第三方登录提供商
   */
  getAvailableOAuthProviders(): OAuthProviderConfig[];
}

