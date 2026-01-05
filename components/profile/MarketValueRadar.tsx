/**
 * Market Value Radar Chart Component - 市场价值雷达图组件
 * 使用recharts展示10因子分数
 *
 * @requires recharts - 需要安装: npm install recharts
 */

'use client';

import { memo, useMemo } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import type { ScoreBreakdown } from '@/lib/scoring';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';

// ========================================
// 类型定义
// ========================================

interface MarketValueRadarProps {
  /** 分数细分数据 */
  scoreBreakdown: ScoreBreakdown;
  /** 是否显示加载骨架 */
  isLoading?: boolean;
  /** 图表尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 主题颜色 */
  color?: string;
}

interface RadarDataPoint {
  factor: string;
  fullName: string;
  score: number;
  fullMark: number;
}

// ========================================
// 常量
// ========================================

/** 尺寸配置 */
const SIZE_CONFIG = {
  sm: { width: 280, height: 240, outerRadius: 80 },
  md: { width: 360, height: 300, outerRadius: 100 },
  lg: { width: 480, height: 400, outerRadius: 140 }
};

// ========================================
// 骨架屏组件
// ========================================

function RadarSkeleton({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const { width, height } = SIZE_CONFIG[size];
  
  return (
    <div 
      className="animate-pulse flex items-center justify-center"
      style={{ width, height }}
    >
      <div 
        className="rounded-full bg-gray-200 dark:bg-gray-700"
        style={{ 
          width: SIZE_CONFIG[size].outerRadius * 2, 
          height: SIZE_CONFIG[size].outerRadius * 2 
        }}
      />
    </div>
  );
}

// ========================================
// 自定义Tooltip组件
// ========================================

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: RadarDataPoint;
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  
  const data = payload[0].payload;
  
  return (
    <div className="bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
        {data.fullName}
      </p>
      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
        {data.score} / 100
      </p>
    </div>
  );
}

// ========================================
// 主组件
// ========================================

function MarketValueRadarComponent({
  scoreBreakdown,
  isLoading = false,
  size = 'md',
  color = '#3B82F6' // 默认蓝色
}: MarketValueRadarProps) {
  const { language } = useLanguage();
  const t = useTranslations(language);

  // 转换数据为雷达图格式
  const radarData = useMemo((): RadarDataPoint[] => {
    const factors = Object.keys(scoreBreakdown) as (keyof ScoreBreakdown)[];

    return factors.map(factor => ({
      factor: t.marketValue.factors[factor].short,
      fullName: t.marketValue.factors[factor].name,
      score: scoreBreakdown[factor],
      fullMark: 100
    }));
  }, [scoreBreakdown, t]);

  // 尺寸配置
  const { width, height, outerRadius } = SIZE_CONFIG[size];

  // 加载状态
  if (isLoading) {
    return <RadarSkeleton size={size} />;
  }

  return (
    <div className="flex items-center justify-center">
      <ResponsiveContainer width={width} height={height}>
        <RadarChart
          cx="50%"
          cy="50%"
          outerRadius={outerRadius}
          data={radarData}
        >
          {/* 极坐标网格 */}
          <PolarGrid
            stroke="#e5e7eb"
            strokeDasharray="3 3"
          />

          {/* 角度轴（因子名称） */}
          <PolarAngleAxis
            dataKey="factor"
            tick={{
              fill: '#6b7280',
              fontSize: size === 'sm' ? 10 : 12
            }}
          />

          {/* 半径轴（分数刻度） */}
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{
              fill: '#9ca3af',
              fontSize: 10
            }}
            tickCount={5}
          />

          {/* 雷达图形 */}
          <Radar
            name="Score"
            dataKey="score"
            stroke={color}
            fill={color}
            fillOpacity={0.3}
            strokeWidth={2}
          />

          {/* 悬浮提示 */}
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

// 使用memo优化性能
export const MarketValueRadar = memo(MarketValueRadarComponent);

// ========================================
// 迷你版雷达图（用于卡片展示）
// ========================================

interface MiniRadarProps {
  scoreBreakdown: ScoreBreakdown;
  color?: string;
}

function MiniRadarComponent({ scoreBreakdown, color = '#3B82F6' }: MiniRadarProps) {
  const { language } = useLanguage();
  const t = useTranslations(language);

  const radarData = useMemo((): RadarDataPoint[] => {
    const factors = Object.keys(scoreBreakdown) as (keyof ScoreBreakdown)[];

    return factors.map(factor => ({
      factor: t.marketValue.factors[factor].short,
      fullName: t.marketValue.factors[factor].name,
      score: scoreBreakdown[factor],
      fullMark: 100
    }));
  }, [scoreBreakdown, t]);

  return (
    <div className="w-24 h-24">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart
          cx="50%"
          cy="50%"
          outerRadius={35}
          data={radarData}
        >
          <PolarGrid stroke="#e5e7eb" />
          <Radar
            dataKey="score"
            stroke={color}
            fill={color}
            fillOpacity={0.3}
            strokeWidth={1}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export const MiniRadar = memo(MiniRadarComponent);

export default MarketValueRadar;

