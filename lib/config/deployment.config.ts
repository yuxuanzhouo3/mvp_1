/**
 * 部署配置文件
 * Deployment Configuration
 *
 * 根据环境变量 NEXT_PUBLIC_DEPLOYMENT_REGION 区分部署区域：
 * - "CN": 中国版（默认使用中文）
 * - "INTL" 或未设置: 国际版（默认使用英文）
 */

/**
 * 部署区域类型
 */
export type DeploymentRegion = "CN" | "INTL";

/**
 * 部署配置接口
 */
export interface DeploymentConfig {
  /** 部署区域：CN=中国，INTL=国际 */
  region: DeploymentRegion;

  /** 默认语言 */
  defaultLanguage: "zh" | "en";

  /** 应用名称 */
  appName: string;

  /** 应用版本 */
  version: string;
}

/**
 * 根据部署区域生成配置
 */
function generateConfig(region: DeploymentRegion): DeploymentConfig {
  const isChinaRegion = region === "CN";

  return {
    region,
    defaultLanguage: isChinaRegion ? "zh" : "en",
    appName: isChinaRegion ? "晨佑个人链接" : "PersonaLink - AI Friend Matcher",
    version: "1.0.0",
  };
}

/**
 * 当前部署区域
 *
 * 环境变量 NEXT_PUBLIC_DEPLOYMENT_REGION：
 * - "INTL"：国际版
 * - 其他值或未设置：中国版 (CN，默认)
 */
const DEPLOYMENT_REGION: DeploymentRegion =
  process.env.NEXT_PUBLIC_DEPLOYMENT_REGION === "CN" || process.env.NEXT_PUBLIC_DEPLOYMENT_REGION === "INTL"
    ? (process.env.NEXT_PUBLIC_DEPLOYMENT_REGION as DeploymentRegion)
    : "INTL";

/**
 * 导出当前配置
 */
export const deploymentConfig: DeploymentConfig =
  generateConfig(DEPLOYMENT_REGION);

/**
 * 导出部署区域
 */
export const currentRegion: DeploymentRegion = DEPLOYMENT_REGION;

/**
 * 判断是否为中国区域
 *
 * 优先使用构建时环境变量，如果未设置则检查运行时标识：
 * - localStorage 中是否有 cn_user 数据
 * - cookie 中是否有 cn_session
 * 这样即使构建时环境变量配置错误，也能在运行时正确识别 CN 环境
 */
export function isChinaDeployment(): boolean {
  const envRegion = process.env.NEXT_PUBLIC_DEPLOYMENT_REGION;
  if (envRegion === "CN") return true;
  if (envRegion === "INTL") return false;

  if (typeof window !== 'undefined') {
    const host = window.location?.host?.toLowerCase?.() || '';
    if (host.includes('mornscience.top')) return true;
    if (host.includes('mornhub.lat')) return false;
  }

  // 运行时检测：如果有 CN 认证数据，说明是 CN 环境
  if (typeof window !== 'undefined') {
    const hasCnUser = localStorage.getItem('cn_user');
    const hasCnSession = document.cookie
      .split(';')
      .some(c => c.trim().startsWith('cn_session=') || c.trim().startsWith('cn_session_cross='));

    if (hasCnUser || hasCnSession) {
      return true;
    }
  }

  return false;
}

/**
 * 判断是否为国际区域
 */
export function isInternationalDeployment(): boolean {
  return deploymentConfig.region === "INTL";
}

/**
 * 获取默认语言
 */
export function getDefaultLanguage(): "zh" | "en" {
  return deploymentConfig.defaultLanguage;
}
