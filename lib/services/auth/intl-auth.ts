/**
 * INTL 环境认证服务实现 (Supabase Auth + Google)
 * INTL Environment Authentication Service Implementation
 */

import { getSupabaseClient } from '@/lib/supabase/client';
import type {
  IAuthService,
  AuthUser,
  AuthResult,
  RegisterData,
  OAuthProviderConfig,
} from './types';

/**
 * INTL 认证服务 - 基于 Supabase Auth
 */
export class IntlAuthService implements IAuthService {
  private getClient() {
    return getSupabaseClient();
  }

  async signInWithEmail(email: string, password: string): Promise<AuthResult> {
    const supabase = this.getClient();
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
        errorCode: error.code,
      };
    }

    return {
      success: true,
      user: this.mapUser(data.user),
      session: {
        accessToken: data.session?.access_token || '',
        refreshToken: data.session?.refresh_token,
        expiresAt: data.session?.expires_at,
      },
    };
  }

  async signUpWithEmail(data: RegisterData): Promise<AuthResult> {
    const supabase = this.getClient();
    
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          display_name: data.displayName,
          phone: data.phone,
        },
      },
    });

    if (error) {
      return {
        success: false,
        error: error.message,
        errorCode: error.code,
      };
    }

    return {
      success: true,
      user: authData.user ? this.mapUser(authData.user) : undefined,
      session: authData.session ? {
        accessToken: authData.session.access_token,
        refreshToken: authData.session.refresh_token,
        expiresAt: authData.session.expires_at,
      } : undefined,
    };
  }

  async signInWithOAuth(provider: 'google' | 'wechat', redirectUrl?: string): Promise<AuthResult> {
    if (provider === 'wechat') {
      return {
        success: false,
        error: 'WeChat login is not available in INTL region',
        errorCode: 'PROVIDER_NOT_AVAILABLE',
      };
    }

    const supabase = this.getClient();
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl || `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });

    if (error) {
      return {
        success: false,
        error: error.message,
        errorCode: error.code,
      };
    }

    // OAuth 会重定向，这里返回成功状态和重定向 URL
    return {
      success: true,
      session: {
        accessToken: data.url || '',
      },
    };
  }

  async handleOAuthCallback(_provider: 'google' | 'wechat', code: string): Promise<AuthResult> {
    const supabase = this.getClient();
    
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return {
        success: false,
        error: error.message,
        errorCode: error.code,
      };
    }

    return {
      success: true,
      user: data.user ? this.mapUser(data.user) : undefined,
      session: data.session ? {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at,
      } : undefined,
    };
  }

  async signOut(): Promise<{ success: boolean; error?: string }> {
    const supabase = this.getClient();
    
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const supabase = this.getClient();
    
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return this.mapUser(user);
  }

  async getSession(): Promise<{ accessToken: string; refreshToken?: string } | null> {
    const supabase = this.getClient();
    
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      return null;
    }

    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
    };
  }

  async refreshSession(): Promise<AuthResult> {
    const supabase = this.getClient();
    
    const { data, error } = await supabase.auth.refreshSession();

    if (error) {
      return {
        success: false,
        error: error.message,
        errorCode: error.code,
      };
    }

    return {
      success: true,
      user: data.user ? this.mapUser(data.user) : undefined,
      session: data.session ? {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at,
      } : undefined,
    };
  }

  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    const supabase = this.getClient();
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/update-password`,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  async updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    const supabase = this.getClient();
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  getAvailableOAuthProviders(): OAuthProviderConfig[] {
    return [
      {
        id: 'google',
        name: 'Google',
        icon: 'google',
        available: true,
      },
    ];
  }

  // 辅助方法：映射 Supabase User 到 AuthUser
  private mapUser(user: any): AuthUser {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      displayName: user.user_metadata?.display_name || user.user_metadata?.full_name,
      avatarUrl: user.user_metadata?.avatar_url,
      provider: user.app_metadata?.provider === 'google' ? 'google' : 'email',
      metadata: user.user_metadata,
    };
  }
}

