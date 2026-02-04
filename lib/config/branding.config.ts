import { isChinaDeployment } from '@/lib/config/deployment.config';
import { isWechatMiniProgramUserAgent, isWechatMiniProgramWebView } from '@/lib/utils/miniprogram-compat';

export function getBrandName(input?: { isCN?: boolean; isWechatMiniProgram?: boolean; userAgent?: string | null }): string {
  const isCN = typeof input?.isCN === 'boolean' ? input.isCN : isChinaDeployment();
  const isMiniProgram =
    typeof input?.isWechatMiniProgram === 'boolean'
      ? input.isWechatMiniProgram
      : typeof input?.userAgent === 'string'
        ? isWechatMiniProgramUserAgent(input.userAgent)
        : isWechatMiniProgramWebView();

  if (isCN && isMiniProgram) return '晨佑个人链接';
  if (isCN) return '摩尔相亲';
  return 'PersonaLink';
}
