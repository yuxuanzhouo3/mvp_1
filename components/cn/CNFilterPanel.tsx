/**
 * CN版筛选面板组件
 * 家长关注的筛选条件（门当户对相关）
 */

'use client';

import { memo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';
import { 
  Filter,
  RotateCcw,
  GraduationCap,
  Briefcase,
  MapPin,
  Home,
  Car,
  Users,
  Heart
} from 'lucide-react';

// ========================================
// 类型定义
// ========================================

interface CNFilterValues {
  /** 年龄范围 */
  ageRange: [number, number];
  /** 学历要求 */
  educationLevels: string[];
  /** 公司类型要求 */
  companyTypes: string[];
  /** 收入范围 */
  incomeRange: string[];
  /** 婚姻状况 */
  maritalStatuses: string[];
  /** 籍贯/省份 */
  hometownProvinces: string[];
  /** 必须有房 */
  requireHouse: boolean;
  /** 必须有车 */
  requireCar: boolean;
  /** 生育意愿 */
  childrenPreference: string[];
}

interface CNFilterPanelProps {
  /** 当前筛选值 */
  values: CNFilterValues;
  /** 值变更回调 */
  onChange: (values: CNFilterValues) => void;
  /** 应用筛选回调 */
  onApply?: () => void;
  /** 重置回调 */
  onReset?: () => void;
  /** 是否折叠模式 */
  collapsed?: boolean;
  /** 自定义类名 */
  className?: string;
}

// ========================================
// 默认筛选值
// ========================================

export const defaultCNFilterValues: CNFilterValues = {
  ageRange: [22, 35],
  educationLevels: [],
  companyTypes: [],
  incomeRange: [],
  maritalStatuses: [],
  hometownProvinces: [],
  requireHouse: false,
  requireCar: false,
  childrenPreference: []
};

// ========================================
// 选项配置
// ========================================

const educationOptions = [
  { value: 'high_school', label: '高中' },
  { value: 'associate', label: '大专' },
  { value: 'bachelor', label: '本科' },
  { value: 'master', label: '硕士' },
  { value: 'doctorate', label: '博士' }
];

const companyTypeOptions = [
  { value: 'government', label: '公务员/事业单位' },
  { value: 'state_owned', label: '国企' },
  { value: 'large_corp', label: '大型企业' },
  { value: 'sme', label: '中小企业' },
  { value: 'startup', label: '创业公司' },
  { value: 'freelance', label: '自由职业' }
];

const incomeOptions = [
  { value: 'below_50k', label: '5万以下' },
  { value: '50k_100k', label: '5-10万' },
  { value: '100k_200k', label: '10-20万' },
  { value: '200k_500k', label: '20-50万' },
  { value: '500k_1m', label: '50-100万' },
  { value: 'above_1m', label: '100万以上' }
];

const maritalStatusOptions = [
  { value: 'single', label: '未婚' },
  { value: 'divorced', label: '离异' },
  { value: 'widowed', label: '丧偶' }
];

const childrenOptions = [
  { value: 'none', label: '不要孩子' },
  { value: 'one', label: '想要1个' },
  { value: 'two', label: '想要2个及以上' },
  { value: 'flexible', label: '随缘' }
];

const provinceOptions = [
  '北京', '上海', '广东', '江苏', '浙江', 
  '山东', '河南', '四川', '湖北', '湖南',
  '福建', '安徽', '河北', '辽宁', '陕西',
  '其他'
];

// ========================================
// 复选框组组件
// ========================================

interface CheckboxGroupProps {
  options: { value: string; label: string }[];
  values: string[];
  onChange: (values: string[]) => void;
  columns?: number;
}

function CheckboxGroup({ options, values, onChange, columns = 3 }: CheckboxGroupProps) {
  const toggleValue = (value: string) => {
    if (values.includes(value)) {
      onChange(values.filter(v => v !== value));
    } else {
      onChange([...values, value]);
    }
  };

  return (
    <div className={`grid grid-cols-${columns} gap-2`} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {options.map(option => (
        <label
          key={option.value}
          className={cn(
            "flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors",
            values.includes(option.value)
              ? "bg-red-50 border-red-200 text-red-700"
              : "bg-white border-gray-200 hover:bg-gray-50"
          )}
        >
          <Checkbox
            checked={values.includes(option.value)}
            onCheckedChange={() => toggleValue(option.value)}
          />
          <span className="text-sm">{option.label}</span>
        </label>
      ))}
    </div>
  );
}

// ========================================
// 主组件
// ========================================

function CNFilterPanelComponent({
  values,
  onChange,
  onApply,
  onReset,
  collapsed = false,
  className
}: CNFilterPanelProps) {
  const { language } = useLanguage();
  const t = useTranslations(language);
  const [isExpanded, setIsExpanded] = useState(!collapsed);

  const updateValue = <K extends keyof CNFilterValues>(
    key: K,
    value: CNFilterValues[K]
  ) => {
    onChange({ ...values, [key]: value });
  };

  const handleReset = () => {
    onChange(defaultCNFilterValues);
    onReset?.();
  };

  // 计算已设置的筛选条件数量
  const activeFilterCount = [
    values.educationLevels.length > 0,
    values.companyTypes.length > 0,
    values.incomeRange.length > 0,
    values.maritalStatuses.length > 0,
    values.hometownProvinces.length > 0,
    values.requireHouse,
    values.requireCar,
    values.childrenPreference.length > 0
  ].filter(Boolean).length;

  return (
    <Card className={cn("theme-cn cn-filter-panel", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="cn-filter-title">
            <Filter className="w-5 h-5 text-red-500" />
            筛选条件
            {activeFilterCount > 0 && (
              <span className="cn-badge cn-badge-primary ml-2">
                已选 {activeFilterCount} 项
              </span>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {collapsed && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? '收起' : '展开'}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              重置
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6">
          {/* 年龄范围 */}
          <div className="cn-filter-group">
            <Label className="cn-filter-label flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-500" />
              年龄范围
              <span className="text-red-500 ml-2">
                {values.ageRange[0]} - {values.ageRange[1]} 岁
              </span>
            </Label>
            <Slider
              value={values.ageRange}
              onValueChange={(value) => updateValue('ageRange', value as [number, number])}
              min={18}
              max={60}
              step={1}
              className="mt-4"
            />
          </div>

          {/* 学历要求 */}
          <div className="cn-filter-group">
            <Label className="cn-filter-label flex items-center gap-2 mb-3">
              <GraduationCap className="w-4 h-4 text-blue-500" />
              学历要求
            </Label>
            <CheckboxGroup
              options={educationOptions}
              values={values.educationLevels}
              onChange={(v) => updateValue('educationLevels', v)}
            />
          </div>

          {/* 单位性质 */}
          <div className="cn-filter-group">
            <Label className="cn-filter-label flex items-center gap-2 mb-3">
              <Briefcase className="w-4 h-4 text-green-500" />
              单位性质
            </Label>
            <CheckboxGroup
              options={companyTypeOptions}
              values={values.companyTypes}
              onChange={(v) => updateValue('companyTypes', v)}
              columns={2}
            />
          </div>

          {/* 收入范围 */}
          <div className="cn-filter-group">
            <Label className="cn-filter-label flex items-center gap-2 mb-3">
              <span className="text-yellow-500">💰</span>
              年收入
            </Label>
            <CheckboxGroup
              options={incomeOptions}
              values={values.incomeRange}
              onChange={(v) => updateValue('incomeRange', v)}
              columns={2}
            />
          </div>

          {/* 房车要求 */}
          <div className="cn-filter-group">
            <Label className="cn-filter-label mb-3">房产车产</Label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={values.requireHouse}
                  onCheckedChange={(checked) => updateValue('requireHouse', checked)}
                />
                <Home className="w-4 h-4 text-orange-500" />
                <span>必须有房</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={values.requireCar}
                  onCheckedChange={(checked) => updateValue('requireCar', checked)}
                />
                <Car className="w-4 h-4 text-blue-500" />
                <span>必须有车</span>
              </label>
            </div>
          </div>

          {/* 婚姻状况 */}
          <div className="cn-filter-group">
            <Label className="cn-filter-label flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-purple-500" />
              婚姻状况
            </Label>
            <CheckboxGroup
              options={maritalStatusOptions}
              values={values.maritalStatuses}
              onChange={(v) => updateValue('maritalStatuses', v)}
            />
          </div>

          {/* 籍贯省份 */}
          <div className="cn-filter-group">
            <Label className="cn-filter-label flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-red-500" />
              籍贯省份
            </Label>
            <div className="flex flex-wrap gap-2">
              {provinceOptions.map(province => (
                <Button
                  key={province}
                  variant={values.hometownProvinces.includes(province) ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    if (values.hometownProvinces.includes(province)) {
                      updateValue('hometownProvinces', values.hometownProvinces.filter(p => p !== province));
                    } else {
                      updateValue('hometownProvinces', [...values.hometownProvinces, province]);
                    }
                  }}
                  className={cn(
                    "text-sm",
                    values.hometownProvinces.includes(province) && "cn-btn-primary"
                  )}
                >
                  {province}
                </Button>
              ))}
            </div>
          </div>

          {/* 生育意愿 */}
          <div className="cn-filter-group">
            <Label className="cn-filter-label flex items-center gap-2 mb-3">
              <span className="text-pink-400">👶</span>
              生育意愿
            </Label>
            <CheckboxGroup
              options={childrenOptions}
              values={values.childrenPreference}
              onChange={(v) => updateValue('childrenPreference', v)}
              columns={2}
            />
          </div>

          {/* 应用按钮 */}
          {onApply && (
            <div className="pt-4">
              <Button 
                onClick={onApply}
                className="cn-btn cn-btn-primary w-full"
              >
                <Filter className="w-4 h-4 mr-2" />
                应用筛选条件
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export const CNFilterPanel = memo(CNFilterPanelComponent);
export default CNFilterPanel;

