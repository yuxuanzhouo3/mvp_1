/**
 * 认证服务统一导出
 * Authentication Service Unified Exports
 */

export * from './types';

// 根据环境获取认证服务
import { isChinaDeployment } from '@/lib/config/deployment.config';
import type { IAuthService } from './types';

/**
 * 获取当前环境的认证服务（异步）
 * 使用动态导入避免在 INTL 环境加载 Cloudbase SDK
 */
export async function getAuthServiceAsync(): Promise<IAuthService> {
  if (isChinaDeployment()) {
    const { CnAuthService } = await import('./cn-auth');
    return new CnAuthService();
  }
  const { IntlAuthService } = await import('./intl-auth');
  return new IntlAuthService();
}

/**
 * 获取当前环境的认证服务（同步，仅 INTL 环境可用）
 */
export function getAuthService(): IAuthService {
  if (isChinaDeployment()) {
    throw new Error('CN environment requires async auth service. Use getAuthServiceAsync() instead.');
  }
  const { IntlAuthService } = require('./intl-auth');
  return new IntlAuthService();
}
