/**
 * INTL Filter Panel Component
 * 国际版筛选面板组件
 * 
 * 设计理念：强调兴趣爱好、性格兼容性、生活方式
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  SlidersHorizontal, 
  MapPin, 
  Heart, 
  Brain, 
  Sparkles,
  X,
  RotateCcw
} from 'lucide-react';
import { useTranslations } from '@/lib/i18n';
import { useLanguage } from '@/components/language-provider';
import { cn } from '@/lib/utils';
import type { MBTIType } from '@/types/database';

// ========================================
// 类型定义
// ========================================

interface INTLFilterPanelProps {
  onApplyFilters: (filters: INTLFilters) => void;
  onReset?: () => void;
  initialFilters?: Partial<INTLFilters>;
  className?: string;
}

export interface INTLFilters {
  ageRange: [number, number];
  distanceKm: number;
  hasPhotos: boolean;
  verifiedOnly: boolean;
  mbtiTypes: MBTIType[];
  interests: string[];
  lookingFor: 'relationship' | 'friendship' | 'casual' | 'any';
  educationLevel: string;
  onlineNow: boolean;
}

const defaultFilters: INTLFilters = {
  ageRange: [18, 50],
  distanceKm: 100,
  hasPhotos: true,
  verifiedOnly: false,
  mbtiTypes: [],
  interests: [],
  lookingFor: 'any',
  educationLevel: 'any',
  onlineNow: false,
};

// MBTI类型分组
const mbtiGroups = {
  analysts: ['INTJ', 'INTP', 'ENTJ', 'ENTP'] as MBTIType[],
  diplomats: ['INFJ', 'INFP', 'ENFJ', 'ENFP'] as MBTIType[],
  sentinels: ['ISTJ', 'ISFJ', 'ESTJ', 'ESFJ'] as MBTIType[],
  explorers: ['ISTP', 'ISFP', 'ESTP', 'ESFP'] as MBTIType[],
};

const mbtiGroupNames = {
  en: {
    analysts: 'Analysts',
    diplomats: 'Diplomats',
    sentinels: 'Sentinels',
    explorers: 'Explorers',
  },
  zh: {
    analysts: '分析师',
    diplomats: '外交官',
    sentinels: '守卫者',
    explorers: '探险家',
  },
};

// ========================================
// 主组件
// ========================================

export const INTLFilterPanel: React.FC<INTLFilterPanelProps> = ({
  onApplyFilters,
  onReset,
  initialFilters,
  className,
}) => {
  const { language } = useLanguage();
  const t = useTranslations(language);
  const locale = language === 'zh' ? 'zh' : 'en';

  const [filters, setFilters] = useState<INTLFilters>({
    ...defaultFilters,
    ...initialFilters,
  });

  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  // 计算活跃筛选条件数量
  React.useEffect(() => {
    let count = 0;
    if (filters.ageRange[0] !== 18 || filters.ageRange[1] !== 50) count++;
    if (filters.distanceKm !== 100) count++;
    if (!filters.hasPhotos) count++;
    if (filters.verifiedOnly) count++;
    if (filters.mbtiTypes.length > 0) count++;
    if (filters.interests.length > 0) count++;
    if (filters.lookingFor !== 'any') count++;
    if (filters.educationLevel !== 'any') count++;
    if (filters.onlineNow) count++;
    setActiveFiltersCount(count);
  }, [filters]);

  const handleReset = () => {
    setFilters(defaultFilters);
    onReset?.();
  };

  const handleApply = () => {
    onApplyFilters(filters);
  };

  const toggleMbtiType = (type: MBTIType) => {
    setFilters(prev => ({
      ...prev,
      mbtiTypes: prev.mbtiTypes.includes(type)
        ? prev.mbtiTypes.filter(t => t !== type)
        : [...prev.mbtiTypes, type],
    }));
  };

  const selectMbtiGroup = (group: keyof typeof mbtiGroups) => {
    const types = mbtiGroups[group];
    const allSelected = types.every(t => filters.mbtiTypes.includes(t));

    setFilters(prev => ({
      ...prev,
      mbtiTypes: allSelected
        ? prev.mbtiTypes.filter(t => !types.includes(t))
        : Array.from(new Set([...prev.mbtiTypes, ...types])),
    }));
  };

  return (
    <Card className={cn("intl-filter-panel", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <SlidersHorizontal className="w-5 h-5 text-violet-500" />
            {locale === 'zh' ? '筛选条件' : 'Filters'}
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount}
              </Badge>
            )}
          </CardTitle>
          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-1" />
              {locale === 'zh' ? '重置' : 'Reset'}
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Accordion type="multiple" className="space-y-2" defaultValue={['basic', 'personality']}>
          {/* 基本筛选 */}
          <AccordionItem value="basic" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-500" />
                {locale === 'zh' ? '基本条件' : 'Basic'}
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              {/* 年龄范围 */}
              <div>
                <Label className="text-sm font-medium">
                  {locale === 'zh' ? '年龄范围' : 'Age Range'}: {filters.ageRange[0]} - {filters.ageRange[1]}
                </Label>
                <Slider
                  min={18}
                  max={70}
                  step={1}
                  value={filters.ageRange}
                  onValueChange={(val) => setFilters(prev => ({ ...prev, ageRange: [val[0], val[1]] }))}
                  className="mt-2"
                />
              </div>

              {/* 距离 */}
              <div>
                <Label className="text-sm font-medium flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-violet-500" />
                  {locale === 'zh' ? '最大距离' : 'Max Distance'}: {filters.distanceKm} km
                </Label>
                <Slider
                  min={5}
                  max={500}
                  step={5}
                  value={[filters.distanceKm]}
                  onValueChange={(val) => setFilters(prev => ({ ...prev, distanceKm: val[0] }))}
                  className="mt-2"
                />
              </div>

              {/* 寻找什么 */}
              <div>
                <Label className="text-sm font-medium">
                  {locale === 'zh' ? '寻找什么' : 'Looking For'}
                </Label>
                <Select 
                  value={filters.lookingFor} 
                  onValueChange={(val: INTLFilters['lookingFor']) => 
                    setFilters(prev => ({ ...prev, lookingFor: val }))
                  }
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">{locale === 'zh' ? '不限' : 'Anything'}</SelectItem>
                    <SelectItem value="relationship">{locale === 'zh' ? '认真恋爱' : 'Relationship'}</SelectItem>
                    <SelectItem value="friendship">{locale === 'zh' ? '交朋友' : 'Friendship'}</SelectItem>
                    <SelectItem value="casual">{locale === 'zh' ? '随缘' : 'Casual'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 性格筛选 */}
          <AccordionItem value="personality" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-violet-500" />
                {locale === 'zh' ? '性格类型' : 'Personality'}
                {filters.mbtiTypes.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {filters.mbtiTypes.length}
                  </Badge>
                )}
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              {/* MBTI组选择 */}
              <div className="flex flex-wrap gap-2">
                {Object.entries(mbtiGroups).map(([group, types]) => {
                  const allSelected = types.every(t => filters.mbtiTypes.includes(t));
                  return (
                    <Button
                      key={group}
                      variant={allSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => selectMbtiGroup(group as keyof typeof mbtiGroups)}
                      className={cn(
                        "text-xs",
                        allSelected && "bg-violet-500 hover:bg-violet-600"
                      )}
                    >
                      {mbtiGroupNames[locale][group as keyof typeof mbtiGroupNames['en']]}
                    </Button>
                  );
                })}
              </div>

              {/* MBTI类型网格 */}
              <div className="grid grid-cols-4 gap-2">
                {Object.values(mbtiGroups).flat().map((type) => (
                  <Button
                    key={type}
                    variant={filters.mbtiTypes.includes(type) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleMbtiType(type)}
                    className={cn(
                      "text-xs h-8",
                      filters.mbtiTypes.includes(type) && "bg-violet-500 hover:bg-violet-600"
                    )}
                  >
                    {type}
                  </Button>
                ))}
              </div>

              {/* 已选类型 */}
              {filters.mbtiTypes.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {filters.mbtiTypes.map(type => (
                    <Badge 
                      key={type} 
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive/20"
                      onClick={() => toggleMbtiType(type)}
                    >
                      {type}
                      <X className="w-3 h-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* 高级筛选 */}
          <AccordionItem value="advanced" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-500" />
                {locale === 'zh' ? '更多选项' : 'More Options'}
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              {/* 开关选项 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">
                    {locale === 'zh' ? '有照片' : 'Has Photos'}
                  </Label>
                  <Switch
                    checked={filters.hasPhotos}
                    onCheckedChange={(checked) => 
                      setFilters(prev => ({ ...prev, hasPhotos: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-sm">
                    {locale === 'zh' ? '仅认证用户' : 'Verified Only'}
                  </Label>
                  <Switch
                    checked={filters.verifiedOnly}
                    onCheckedChange={(checked) => 
                      setFilters(prev => ({ ...prev, verifiedOnly: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-sm">
                    {locale === 'zh' ? '在线中' : 'Online Now'}
                  </Label>
                  <Switch
                    checked={filters.onlineNow}
                    onCheckedChange={(checked) => 
                      setFilters(prev => ({ ...prev, onlineNow: checked }))
                    }
                  />
                </div>
              </div>

              {/* 学历 */}
              <div>
                <Label className="text-sm font-medium">
                  {locale === 'zh' ? '学历要求' : 'Education'}
                </Label>
                <Select 
                  value={filters.educationLevel} 
                  onValueChange={(val) => 
                    setFilters(prev => ({ ...prev, educationLevel: val }))
                  }
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">{locale === 'zh' ? '不限' : 'Any'}</SelectItem>
                    <SelectItem value="high_school">{locale === 'zh' ? '高中' : 'High School'}</SelectItem>
                    <SelectItem value="bachelor">{locale === 'zh' ? '本科' : 'Bachelor\'s'}</SelectItem>
                    <SelectItem value="master">{locale === 'zh' ? '硕士' : 'Master\'s'}</SelectItem>
                    <SelectItem value="doctorate">{locale === 'zh' ? '博士' : 'Doctorate'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* 应用按钮 */}
        <Button 
          onClick={handleApply} 
          className="w-full bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
        >
          {locale === 'zh' ? '应用筛选' : 'Apply Filters'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default INTLFilterPanel;

