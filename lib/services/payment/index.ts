/**
 * 支付服务统一导出
 * Payment Service Unified Exports
 */

export * from './types';
export * from './intl-payment';
export * from './cn-payment';

// 根据环境获取支付服务
import { isChinaDeployment } from '@/lib/config/deployment.config';
import { IntlPaymentService } from './intl-payment';
import { CnPaymentService } from './cn-payment';
import type { IPaymentService } from './types';

/**
 * 获取当前环境的支付服务
 */
export function getPaymentService(): IPaymentService {
  if (isChinaDeployment()) {
    return new CnPaymentService();
  }
  return new IntlPaymentService();
}

