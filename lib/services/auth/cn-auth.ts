/**
 * CN 环境认证服务实现 (腾讯云 Cloudbase Auth + 微信登录)
 * CN Environment Authentication Service Implementation
 */

import type {
  IAuthService,
  AuthUser,
  AuthResult,
  RegisterData,
  OAuthProviderConfig,
} from './types';

// Cloudbase 认证接口类型
interface CloudbaseAuth {
  currentUser: {
    uid: string;
    email?: string;
    displayName?: string;
    photoURL?: string;
    customUserId?: string;
    // 微信用户信息
    wechatOpenId?: string;
    wechatUnionId?: string;
  } | null;
  signInWithEmailAndPassword(email: string, password: string): Promise<{ credential: { accessToken: string; refreshToken?: string } }>;
  signUpWithEmailAndPassword(email: string, password: string): Promise<any>;
  signInWithRedirect(provider: string): Promise<void>;
  getRedirectResult(): Promise<{ credential?: { accessToken: string }; user?: any }>;
  signOut(): Promise<void>;
  getLoginState(): Promise<{ credential?: { accessToken: string; refreshToken?: string } } | null>;
  sendPasswordResetEmail(email: string): Promise<void>;
  updatePassword(newPassword: string): Promise<void>;
}

interface CloudbaseApp {
  auth(): CloudbaseAuth;
  database(): any;
}

// 微信登录配置
interface WeChatConfig {
  appId: string;
  redirectUri: string;
  scope: string;
  state?: string;
}


// 全局 Cloudbase 实例缓存
let cloudbaseApp: CloudbaseApp | null = null;

/**
 * 初始化 Cloudbase
 */
async function getCloudbaseApp(): Promise<CloudbaseApp> {
  if (cloudbaseApp) {
    return cloudbaseApp;
  }

  try {
    // 使用 webpackIgnore 注释避免 webpack 在构建时解析此模块
    // @ts-ignore - Cloudbase SDK
    const cloudbase = await import(/* webpackIgnore: true */ '@cloudbase/js-sdk');

    cloudbaseApp = (cloudbase.default || cloudbase).init({
      env: process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID || '',
    }) as unknown as CloudbaseApp;

    return cloudbaseApp;
  } catch (error) {
    throw new Error('Cloudbase SDK (@cloudbase/js-sdk) is not installed. Please run: npm install @cloudbase/js-sdk');
  }
}

/**
 * 获取微信开放平台扫码登录 URL
 * 用于PC端扫码登录
 */
function getWeChatOpenLoginUrl(config: WeChatConfig): string {
  const baseUrl = 'https://open.weixin.qq.com/connect/qrconnect';
  const params = new URLSearchParams({
    appid: config.appId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: 'snsapi_login', // 开放平台扫码登录固定scope
    state: config.state || 'wechat_open_login',
  });
  return `${baseUrl}?${params.toString()}#wechat_redirect`;
}

/**
 * 检测是否在微信小程序中
 */
function isWeChatMiniProgram(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return ua.includes('miniprogram') || (window as any).__wxjs_environment === 'miniprogram';
}

/**
 * 检测是否在移动设备上
 */
function isMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * CN 认证服务 - 基于腾讯云 Cloudbase Auth + 微信登录
 */
export class CnAuthService implements IAuthService {
  private async getAuth(): Promise<CloudbaseAuth> {
    const app = await getCloudbaseApp();
    return app.auth();
  }

  async signInWithEmail(email: string, password: string): Promise<AuthResult> {
    try {
      // 🔒 重要：调用登出 API 清除服务端旧会话，防止身份混淆
      // 这确保服务端不会返回旧用户的缓存数据
      try {
        await fetch('/api/auth/cn-logout', { 
          method: 'POST', 
          credentials: 'include',
          cache: 'no-store'
        });
        console.log('[CN Auth] Old session cleared before login');
      } catch (e) {
        // 忽略登出失败，继续登录流程
        console.log('[CN Auth] No previous session to clear');
      }
      
      // 调用服务端 API 进行登录（避免在客户端加载 Cloudbase SDK）
      const response = await fetch('/api/auth/cn-login', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store'
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include', // 确保 cookie 能够被正确设置
        cache: 'no-store', // 防止请求被缓存
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || '登录失败',
          errorCode: 'LOGIN_FAILED',
        };
      }

      console.log('[CN Auth] Login successful for:', result.user?.email);
      
      return {
        success: true,
        user: result.user,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '登录失败',
        errorCode: error.code,
      };
    }
  }

  async signUpWithEmail(data: RegisterData): Promise<AuthResult> {
    try {
      // 调用服务端 API 进行注册（避免在客户端加载 Cloudbase SDK）
      const response = await fetch('/api/auth/cn-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          displayName: data.displayName,
        }),
        credentials: 'include', // 确保 cookie 能够被正确设置
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || '注册失败',
          errorCode: 'REGISTER_FAILED',
        };
      }

      return {
        success: true,
        user: result.user,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '注册失败',
        errorCode: error.code,
      };
    }
  }

  async signInWithOAuth(provider: 'google' | 'wechat', redirectUrl?: string): Promise<AuthResult> {
    if (provider === 'google') {
      return {
        success: false,
        error: 'Google 登录在中国区不可用',
        errorCode: 'PROVIDER_NOT_AVAILABLE',
      };
    }

    try {
      const baseRedirectUrl = redirectUrl || `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/wechat/callback`;

      // 根据运行环境选择登录方式
      if (isWeChatMiniProgram()) {
        // 小程序环境 - 需要通过小程序API获取code后调用后端
        return {
          success: true,
          session: {
            accessToken: 'miniprogram', // 标识需要使用小程序登录流程
          },
        };
      }

      // 检测是否为移动设备
      if (isMobileDevice()) {
        // 移动设备 - 使用微信移动应用登录
        console.log('[WeChat Auth] Using mobile app login flow');
        return {
          success: true,
          session: {
            accessToken: 'mobile_app', // 标识需要使用移动应用登录流程
          },
        };
      }

      // 使用开放平台扫码登录
      const openConfig: WeChatConfig = {
        appId: process.env.NEXT_PUBLIC_WECHAT_APP_ID || '',
        redirectUri: baseRedirectUrl,
        scope: 'snsapi_login',
        state: `wechat_open_${Date.now()}`,
      };
      const loginUrl = getWeChatOpenLoginUrl(openConfig);

      console.log('[WeChat Auth] Using open platform login flow');

      // 返回重定向 URL
      return {
        success: true,
        session: {
          accessToken: loginUrl, // 这里返回的是重定向 URL
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '微信登录初始化失败',
        errorCode: error.code,
      };
    }
  }

  /**
   * 微信小程序登录
   * 前端通过 wx.login 获取 code 后调用此方法
   */
  async signInWithWeChatMiniProgram(code: string): Promise<AuthResult> {
    try {
      // 调用后端API进行小程序登录
      const response = await fetch('/api/auth/wechat/miniprogram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || '小程序登录失败',
          errorCode: result.errorCode,
        };
      }

      return {
        success: true,
        user: result.user,
        session: result.session,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '小程序登录失败',
        errorCode: 'MINIPROGRAM_LOGIN_ERROR',
      };
    }
  }

  async handleOAuthCallback(provider: 'google' | 'wechat', code: string): Promise<AuthResult> {
    if (provider !== 'wechat') {
      return {
        success: false,
        error: 'Invalid provider',
        errorCode: 'INVALID_PROVIDER',
      };
    }

    try {
      // 使用 code 换取 access_token
      // 这里需要调用后端 API 来处理微信回调
      const response = await fetch('/api/auth/wechat/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || '微信登录失败',
          errorCode: result.errorCode,
        };
      }

      return {
        success: true,
        user: result.user,
        session: result.session,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '微信登录回调处理失败',
        errorCode: 'CALLBACK_ERROR',
      };
    }
  }

  async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      const auth = await this.getAuth();
      await auth.signOut();
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '退出登录失败',
      };
    }
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const auth = await this.getAuth();
      const user = auth.currentUser;

      if (!user) {
        return null;
      }

      // 判断登录方式
      let provider: AuthUser['provider'] = 'email';
      if (user.wechatOpenId || user.wechatUnionId || user.customUserId) {
        provider = 'wechat';
      }

      return {
        id: user.uid,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.photoURL,
        provider,
        metadata: {
          wechatOpenId: user.wechatOpenId,
          wechatUnionId: user.wechatUnionId,
        },
      };
    } catch (error) {
      return null;
    }
  }

  async getSession(): Promise<{ accessToken: string; refreshToken?: string } | null> {
    try {
      const auth = await this.getAuth();
      const loginState = await auth.getLoginState();

      if (!loginState?.credential) {
        return null;
      }

      return {
        accessToken: loginState.credential.accessToken,
        refreshToken: loginState.credential.refreshToken,
      };
    } catch (error) {
      return null;
    }
  }

  async refreshSession(): Promise<AuthResult> {
    try {
      const auth = await this.getAuth();
      const loginState = await auth.getLoginState();

      if (!loginState) {
        return {
          success: false,
          error: '会话已过期',
          errorCode: 'SESSION_EXPIRED',
        };
      }

      return {
        success: true,
        user: await this.getCurrentUser() || undefined,
        session: loginState.credential ? {
          accessToken: loginState.credential.accessToken,
          refreshToken: loginState.credential.refreshToken,
        } : undefined,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '刷新会话失败',
        errorCode: error.code,
      };
    }
  }

  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const auth = await this.getAuth();
      await auth.sendPasswordResetEmail(email);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '发送重置邮件失败',
      };
    }
  }

  async updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const auth = await this.getAuth();
      await auth.updatePassword(newPassword);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '更新密码失败',
      };
    }
  }

  getAvailableOAuthProviders(): OAuthProviderConfig[] {
    const providers: OAuthProviderConfig[] = [];

    // 微信登录
    const hasWeChatConfig = !!(
      process.env.NEXT_PUBLIC_WECHAT_APP_ID ||
      process.env.NEXT_PUBLIC_WECHAT_MP_APP_ID ||
      process.env.NEXT_PUBLIC_WECHAT_OPEN_APP_ID
    );

    if (hasWeChatConfig) {
      providers.push({
        id: 'wechat',
        name: '微信登录',
        icon: 'wechat',
        available: true,
      });
    }

    return providers;
  }

  /**
   * 绑定微信账号到现有用户
   * @param userId 当前用户ID
   * @param wechatCode 微信授权code
   */
  async bindWeChatAccount(userId: string, wechatCode: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/auth/wechat/bind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code: wechatCode }),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || '绑定微信失败',
        };
      }

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '绑定微信失败',
      };
    }
  }

  /**
   * 解绑微信账号
   * @param userId 当前用户ID
   */
  async unbindWeChatAccount(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/auth/wechat/unbind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || '解绑微信失败',
        };
      }

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '解绑微信失败',
      };
    }
  }
}

