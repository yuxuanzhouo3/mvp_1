/**
 * CN版家庭背景展示区组件
 * 专为中国家长展示门当户对的家庭信息
 */

'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';
import { 
  Users,
  Home,
  Car,
  MapPin,
  Briefcase,
  GraduationCap,
  Heart,
  Building
} from 'lucide-react';

// ========================================
// 类型定义
// ========================================

interface FamilyBackgroundData {
  /** 父亲职业 */
  fatherOccupation?: string;
  /** 母亲职业 */
  motherOccupation?: string;
  /** 父母工作单位类型 */
  parentCompanyType?: string;
  /** 家庭经济状况 */
  familyEconomicStatus?: 'excellent' | 'good' | 'average' | 'modest';
  /** 兄弟姐妹数量 */
  siblingsCount?: number;
  /** 是否独生子女 */
  isOnlyChild?: boolean;
  /** 老家所在地 */
  hometownCity?: string;
  /** 户籍省份 */
  hukouProvince?: string;
  /** 家庭住房情况 */
  familyHousing?: string;
  /** 是否有房产 */
  hasProperty?: boolean;
  /** 房产数量 */
  propertyCount?: number;
  /** 是否有车 */
  hasCar?: boolean;
  /** 车辆品牌 */
  carBrand?: string;
  /** 家庭简介 */
  familyDescription?: string;
}

interface FamilyBackgroundSectionProps {
  /** 家庭背景数据 */
  data: FamilyBackgroundData;
  /** 是否编辑模式 */
  editable?: boolean;
  /** 编辑回调 */
  onEdit?: () => void;
  /** 自定义类名 */
  className?: string;
}

// ========================================
// 信息项组件
// ========================================

interface InfoItemProps {
  icon: React.ReactNode;
  label: string;
  value?: string | number | null;
  badge?: string;
  badgeVariant?: 'gold' | 'primary' | 'success';
}

function InfoItem({ icon, label, value, badge, badgeVariant = 'gold' }: InfoItemProps) {
  if (!value && !badge) return null;

  const badgeClasses = {
    gold: 'cn-badge-gold',
    primary: 'cn-badge-primary',
    success: 'cn-badge-success'
  };

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <span className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center">
          {icon}
        </span>
        <span className="text-gray-600 font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {value && <span className="text-gray-900 font-semibold">{value}</span>}
        {badge && (
          <Badge className={cn("cn-badge", badgeClasses[badgeVariant])}>
            {badge}
          </Badge>
        )}
      </div>
    </div>
  );
}

// ========================================
// 资产卡片组件
// ========================================

interface AssetCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  highlight?: boolean;
}

function AssetCard({ icon, title, value, highlight }: AssetCardProps) {
  return (
    <div className={cn(
      "p-4 rounded-lg border text-center",
      highlight 
        ? "bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200" 
        : "bg-gray-50 border-gray-200"
    )}>
      <div className={cn(
        "w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center",
        highlight ? "bg-yellow-100" : "bg-gray-100"
      )}>
        {icon}
      </div>
      <div className="text-sm text-gray-500 mb-1">{title}</div>
      <div className={cn(
        "font-semibold",
        highlight ? "text-yellow-700" : "text-gray-700"
      )}>
        {value}
      </div>
    </div>
  );
}

// ========================================
// 经济状况标签
// ========================================

function getEconomicStatusLabel(status?: string) {
  const statusMap: Record<string, { label: string; color: string }> = {
    'excellent': { label: '优越', color: 'text-yellow-600' },
    'good': { label: '良好', color: 'text-green-600' },
    'average': { label: '一般', color: 'text-blue-600' },
    'modest': { label: '普通', color: 'text-gray-600' }
  };
  return statusMap[status || 'average'] || statusMap.average;
}

// ========================================
// 主组件
// ========================================

function FamilyBackgroundSectionComponent({
  data,
  editable = false,
  onEdit,
  className
}: FamilyBackgroundSectionProps) {
  const { language } = useLanguage();
  const t = useTranslations(language);

  const economicStatus = getEconomicStatusLabel(data.familyEconomicStatus);

  return (
    <Card className={cn("theme-cn cn-card", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Users className="w-5 h-5 text-red-500" />
            家庭背景
            <Badge className="cn-badge-gold">门当户对参考</Badge>
          </CardTitle>
          {editable && onEdit && (
            <button
              onClick={onEdit}
              className="text-sm text-red-500 hover:text-red-600"
            >
              编辑
            </button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 资产概览 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <AssetCard
            icon={<Home className="w-5 h-5 text-orange-500" />}
            title="房产"
            value={data.hasProperty 
              ? (data.propertyCount ? `${data.propertyCount}套` : '有') 
              : '暂无'}
            highlight={data.hasProperty}
          />
          <AssetCard
            icon={<Car className="w-5 h-5 text-blue-500" />}
            title="车辆"
            value={data.hasCar 
              ? (data.carBrand || '有车') 
              : '暂无'}
            highlight={data.hasCar}
          />
          <AssetCard
            icon={<Building className="w-5 h-5 text-purple-500" />}
            title="经济状况"
            value={economicStatus.label}
            highlight={data.familyEconomicStatus === 'excellent' || data.familyEconomicStatus === 'good'}
          />
          <AssetCard
            icon={<Users className="w-5 h-5 text-pink-500" />}
            title="子女"
            value={data.isOnlyChild ? '独生子女' : (data.siblingsCount ? `${data.siblingsCount + 1}个兄弟姐妹` : '未知')}
            highlight={data.isOnlyChild}
          />
        </div>

        {/* 详细信息 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            父母职业
          </h4>
          
          <InfoItem
            icon={<span className="text-blue-500">👨</span>}
            label="父亲职业"
            value={data.fatherOccupation}
          />
          
          <InfoItem
            icon={<span className="text-pink-500">👩</span>}
            label="母亲职业"
            value={data.motherOccupation}
          />
          
          {data.parentCompanyType && (
            <InfoItem
              icon={<Building className="w-4 h-4 text-purple-500" />}
              label="工作单位"
              value={data.parentCompanyType}
              badge={['公务员', '国企', '事业单位'].includes(data.parentCompanyType) ? '体制内' : undefined}
              badgeVariant="gold"
            />
          )}
        </div>

        {/* 籍贯信息 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            籍贯信息
          </h4>
          
          <InfoItem
            icon={<MapPin className="w-4 h-4 text-red-500" />}
            label="户籍省份"
            value={data.hukouProvince}
          />
          
          <InfoItem
            icon={<Home className="w-4 h-4 text-green-500" />}
            label="老家所在地"
            value={data.hometownCity}
          />
          
          {data.familyHousing && (
            <InfoItem
              icon={<Building className="w-4 h-4 text-orange-500" />}
              label="住房情况"
              value={data.familyHousing}
            />
          )}
        </div>

        {/* 家庭简介 */}
        {data.familyDescription && (
          <div className="bg-red-50 rounded-lg p-4 border border-red-100">
            <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
              <Heart className="w-4 h-4" />
              家庭简介
            </h4>
            <p className="text-gray-700 leading-relaxed">
              {data.familyDescription}
            </p>
          </div>
        )}

        {/* 提示信息 */}
        <div className="text-center text-sm text-gray-500 pt-2">
          <p>💡 以上信息仅用于匹配参考，我们将严格保护您的隐私</p>
        </div>
      </CardContent>
    </Card>
  );
}

export const FamilyBackgroundSection = memo(FamilyBackgroundSectionComponent);
export default FamilyBackgroundSection;

