/**
 * CN版资料卡片组件
 * 专为中国家长相亲设计，突出学历、工作、家庭背景
 */

'use client';

import { memo } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';
import { 
  GraduationCap, 
  Briefcase, 
  MapPin, 
  Home, 
  Car, 
  Users, 
  Heart,
  MessageCircle,
  Star
} from 'lucide-react';

// ========================================
// 类型定义
// ========================================

interface CNProfileCardProps {
  /** 用户ID */
  userId: string;
  /** 用户名/昵称 */
  username: string;
  /** 年龄 */
  age: number;
  /** 性别 */
  gender: 'male' | 'female' | 'other';
  /** 头像URL */
  avatarUrl?: string;
  /** 学历 */
  education?: string;
  /** 毕业院校 */
  school?: string;
  /** 职业 */
  occupation?: string;
  /** 公司类型 */
  companyType?: string;
  /** 年收入范围 */
  annualIncome?: string;
  /** 籍贯/户籍 */
  hometown?: string;
  /** 所在城市 */
  city?: string;
  /** 是否有房 */
  hasHouse?: boolean;
  /** 是否有车 */
  hasCar?: boolean;
  /** 父母职业 */
  parentOccupation?: string;
  /** 家庭背景描述 */
  familyBackground?: string;
  /** 婚姻状况 */
  maritalStatus?: string;
  /** 生育意愿 */
  childrenPreference?: string;
  /** 匹配分数 */
  matchScore?: number;
  /** 是否显示详细信息 */
  showDetails?: boolean;
  /** 点击喜欢回调 */
  onLike?: () => void;
  /** 点击聊天回调 */
  onChat?: () => void;
  /** 点击查看详情回调 */
  onViewDetails?: () => void;
  /** 自定义类名 */
  className?: string;
}

// ========================================
// 信息行组件
// ========================================

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
  highlight?: boolean;
}

function InfoRow({ icon, label, value, highlight }: InfoRowProps) {
  if (!value) return null;
  
  return (
    <div className="cn-info-row">
      <span className="cn-info-label flex items-center gap-2">
        {icon}
        {label}
      </span>
      <span className={cn(
        "cn-info-value",
        highlight && "cn-info-highlight"
      )}>
        {value}
      </span>
    </div>
  );
}

// ========================================
// 主组件
// ========================================

function CNProfileCardComponent({
  userId,
  username,
  age,
  gender,
  avatarUrl,
  education,
  school,
  occupation,
  companyType,
  annualIncome,
  hometown,
  city,
  hasHouse,
  hasCar,
  parentOccupation,
  familyBackground,
  maritalStatus,
  childrenPreference,
  matchScore,
  showDetails = true,
  onLike,
  onChat,
  onViewDetails,
  className
}: CNProfileCardProps) {
  const { language } = useLanguage();
  const t = useTranslations(language);

  // 资产标签
  const assetBadges = [];
  if (hasHouse) assetBadges.push({ icon: <Home className="w-3 h-3" />, text: '有房' });
  if (hasCar) assetBadges.push({ icon: <Car className="w-3 h-3" />, text: '有车' });

  // 学历显示映射
  const educationMap: Record<string, string> = {
    'high_school': '高中',
    'associate': '大专',
    'bachelor': '本科',
    'master': '硕士',
    'doctorate': '博士'
  };

  // 公司类型显示映射
  const companyTypeMap: Record<string, string> = {
    'government': '公务员/事业单位',
    'state_owned': '国企',
    'large_corp': '大型企业',
    'sme': '中小企业',
    'startup': '创业公司',
    'freelance': '自由职业'
  };

  // 收入范围显示映射
  const incomeMap: Record<string, string> = {
    'below_50k': '5万以下',
    '50k_100k': '5-10万',
    '100k_200k': '10-20万',
    '200k_500k': '20-50万',
    '500k_1m': '50-100万',
    'above_1m': '100万以上'
  };

  // 婚姻状况映射
  const maritalStatusMap: Record<string, string> = {
    'single': '未婚',
    'divorced': '离异',
    'widowed': '丧偶'
  };

  // 生育意愿映射
  const childrenPrefMap: Record<string, string> = {
    'none': '不要孩子',
    'one': '想要1个',
    'two': '想要2个及以上',
    'flexible': '随缘'
  };

  return (
    <Card className={cn("cn-profile-card theme-cn overflow-hidden", className)}>
      {/* 头部区域 */}
      <div className="cn-profile-header relative">
        {/* 匹配分数 */}
        {matchScore !== undefined && (
          <div className="absolute top-4 right-4 flex items-center gap-1 bg-white/20 rounded-full px-3 py-1">
            <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
            <span className="text-white font-bold">{matchScore.toFixed(1)}</span>
          </div>
        )}
        
        {/* 头像 */}
        <div className="cn-profile-avatar overflow-hidden">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={username}
              width={100}
              height={100}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 text-2xl">
              {username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        
        {/* 基本信息 */}
        <div className="cn-profile-name">{username}</div>
        <div className="cn-profile-age">
          {age}岁 · {gender === 'male' ? '男' : gender === 'female' ? '女' : '其他'}
          {city && ` · ${city}`}
        </div>
        
        {/* 资产标签 */}
        {assetBadges.length > 0 && (
          <div className="flex justify-center gap-2 mt-3">
            {assetBadges.map((badge, idx) => (
              <Badge key={idx} className="cn-badge-gold flex items-center gap-1">
                {badge.icon}
                {badge.text}
              </Badge>
            ))}
          </div>
        )}
      </div>
      
      {/* 详细信息区域 */}
      {showDetails && (
        <div className="cn-profile-body">
          {/* 核心信息 - 按CN版优先级排序 */}
          
          {/* 1. 学历/毕业院校 */}
          <InfoRow 
            icon={<GraduationCap className="w-4 h-4 text-blue-500" />}
            label="学历"
            value={education ? (school ? `${educationMap[education] || education}（${school}）` : educationMap[education] || education) : undefined}
            highlight={education === 'master' || education === 'doctorate'}
          />
          
          {/* 2. 工作单位/职业 */}
          <InfoRow 
            icon={<Briefcase className="w-4 h-4 text-green-500" />}
            label="职业"
            value={occupation ? (companyType ? `${occupation}（${companyTypeMap[companyType] || companyType}）` : occupation) : undefined}
            highlight={companyType === 'government' || companyType === 'state_owned'}
          />
          
          {/* 3. 年收入范围 */}
          <InfoRow 
            icon={<span className="text-yellow-500">💰</span>}
            label="年收入"
            value={annualIncome ? incomeMap[annualIncome] || annualIncome : undefined}
            highlight={annualIncome === '200k_500k' || annualIncome === '500k_1m' || annualIncome === 'above_1m'}
          />
          
          {/* 4. 家庭背景 */}
          {(parentOccupation || familyBackground) && (
            <InfoRow 
              icon={<Users className="w-4 h-4 text-purple-500" />}
              label="家庭"
              value={parentOccupation || familyBackground}
            />
          )}
          
          {/* 5. 籍贯 */}
          <InfoRow 
            icon={<MapPin className="w-4 h-4 text-red-500" />}
            label="籍贯"
            value={hometown}
          />
          
          {/* 6. 婚姻状况 */}
          <InfoRow 
            icon={<Heart className="w-4 h-4 text-pink-500" />}
            label="婚况"
            value={maritalStatus ? maritalStatusMap[maritalStatus] || maritalStatus : undefined}
          />
          
          {/* 7. 生育意愿 */}
          <InfoRow 
            icon={<span className="text-pink-400">👶</span>}
            label="生育"
            value={childrenPreference ? childrenPrefMap[childrenPreference] || childrenPreference : undefined}
          />
        </div>
      )}
      
      {/* 操作按钮 */}
      <div className="p-4 pt-0 flex gap-3">
        {onChat && (
          <Button 
            onClick={onChat}
            className="cn-btn cn-btn-secondary flex-1"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            联系
          </Button>
        )}
        {onLike && (
          <Button 
            onClick={onLike}
            className="cn-btn cn-btn-primary flex-1"
          >
            <Heart className="w-4 h-4 mr-2" />
            有意向
          </Button>
        )}
      </div>
      
      {/* 查看详情 */}
      {onViewDetails && (
        <div className="px-4 pb-4">
          <Button 
            variant="ghost" 
            onClick={onViewDetails}
            className="w-full text-gray-500 hover:text-gray-700"
          >
            查看完整资料 →
          </Button>
        </div>
      )}
    </Card>
  );
}

export const CNProfileCard = memo(CNProfileCardComponent);
export default CNProfileCard;

