/**
 * Region Guard Component
 * 区域条件渲染组件
 * 
 * 根据部署区域（CN/INTL）条件渲染不同内容
 */

'use client';

import React from 'react';
import { deploymentConfig, isChinaDeployment, isInternationalDeployment } from '@/lib/config/deployment.config';
import type { DeploymentRegion } from '@/lib/config/deployment.config';

// ========================================
// 类型定义
// ========================================

interface RegionGuardProps {
  /** 仅在CN版显示 */
  cn?: boolean;
  /** 仅在INTL版显示 */
  intl?: boolean;
  /** 要渲染的子组件 */
  children: React.ReactNode;
  /** 不符合条件时渲染的备选内容 */
  fallback?: React.ReactNode;
}

interface RegionSwitchProps {
  /** CN版渲染内容 */
  cn?: React.ReactNode;
  /** INTL版渲染内容 */
  intl?: React.ReactNode;
  /** 默认渲染内容（当没有匹配的区域内容时） */
  fallback?: React.ReactNode;
}

// ========================================
// 辅助函数
// ========================================

/**
 * 获取当前部署区域
 */
export function getCurrentRegion(): DeploymentRegion {
  return deploymentConfig.region;
}

/**
 * 检查是否为中国版
 */
export function isCN(): boolean {
  return isChinaDeployment();
}

/**
 * 检查是否为国际版
 */
export function isINTL(): boolean {
  return isInternationalDeployment();
}

// ========================================
// 组件
// ========================================

/**
 * RegionGuard - 区域条件渲染守卫
 * 
 * 用法示例：
 * ```tsx
 * // 仅在CN版显示
 * <RegionGuard cn>
 *   <CNProfileCard />
 * </RegionGuard>
 * 
 * // 仅在INTL版显示
 * <RegionGuard intl>
 *   <INTLProfileCard />
 * </RegionGuard>
 * 
 * // 带备选内容
 * <RegionGuard cn fallback={<DefaultCard />}>
 *   <CNProfileCard />
 * </RegionGuard>
 * ```
 */
export const RegionGuard: React.FC<RegionGuardProps> = ({
  cn,
  intl,
  children,
  fallback = null,
}) => {
  // 如果同时设置cn和intl，或都不设置，则显示children
  if ((cn && intl) || (!cn && !intl)) {
    return <>{children}</>;
  }

  // 仅CN版
  if (cn && isCN()) {
    return <>{children}</>;
  }

  // 仅INTL版
  if (intl && isINTL()) {
    return <>{children}</>;
  }

  // 不符合条件，返回fallback
  return <>{fallback}</>;
};

/**
 * RegionSwitch - 区域内容切换器
 * 
 * 用法示例：
 * ```tsx
 * <RegionSwitch
 *   cn={<CNHomePage />}
 *   intl={<INTLHomePage />}
 *   fallback={<DefaultHomePage />}
 * />
 * ```
 */
export const RegionSwitch: React.FC<RegionSwitchProps> = ({
  cn,
  intl,
  fallback = null,
}) => {
  if (isCN() && cn !== undefined) {
    return <>{cn}</>;
  }

  if (isINTL() && intl !== undefined) {
    return <>{intl}</>;
  }

  return <>{fallback}</>;
};

/**
 * CNOnly - 仅CN版渲染
 * 
 * 简化版的RegionGuard，仅用于CN版
 */
export const CNOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback = null,
}) => {
  return isCN() ? <>{children}</> : <>{fallback}</>;
};

/**
 * INTLOnly - 仅INTL版渲染
 * 
 * 简化版的RegionGuard，仅用于INTL版
 */
export const INTLOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback = null,
}) => {
  return isINTL() ? <>{children}</> : <>{fallback}</>;
};

// ========================================
// Hook
// ========================================

/**
 * useRegion - 获取当前区域信息的Hook
 * 
 * 用法示例：
 * ```tsx
 * const { region, isCN, isINTL } = useRegion();
 * ```
 */
export function useRegion() {
  return {
    region: getCurrentRegion(),
    isCN: isCN(),
    isINTL: isINTL(),
    config: deploymentConfig,
  };
}

// ========================================
// 导出
// ========================================

export default RegionGuard;

