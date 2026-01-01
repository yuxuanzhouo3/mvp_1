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
    appName: isChinaRegion ? "PersonaLink - AI社交匹配" : "PersonaLink - AI Friend Matcher",
    version: "1.0.0",
  };
}

/**
 * 当前部署区域
 *
 * 环境变量 NEXT_PUBLIC_DEPLOYMENT_REGION：
 * - "CN"：中国版
 * - 其他值或未设置：国际版 (INTL)
 */
const DEPLOYMENT_REGION: DeploymentRegion =
  process.env.NEXT_PUBLIC_DEPLOYMENT_REGION === "CN" ? "CN" : "INTL";

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
 */
export function isChinaDeployment(): boolean {
  return deploymentConfig.region === "CN";
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
