/**
 * INTL Profile Card Component
 * 国际版个人资料卡片组件
 * 
 * 设计理念：现代、简洁、强调个性和兼容性
 */

'use client';

import React from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  Briefcase, 
  GraduationCap, 
  Heart,
  Sparkles,
  MessageCircle
} from 'lucide-react';
import { useTranslations } from '@/lib/i18n';
import { useLanguage } from '@/components/language-provider';
import { cn } from '@/lib/utils';
import type { MBTIType } from '@/types/database';

// ========================================
// 类型定义
// ========================================

interface INTLProfileCardProps {
  user: {
    id: string;
    name: string;
    age: number;
    gender: 'male' | 'female' | 'other';
    avatarUrl?: string;
    bio?: string;
    occupation?: string;
    educationLevel?: string;
    cityName?: string;
    mbti?: MBTIType | null;
    interests?: string[];
    compatibilityScore?: number;
  };
  onLike?: (userId: string) => void;
  onChat?: (userId: string) => void;
  onViewProfile?: (userId: string) => void;
  showActions?: boolean;
  className?: string;
}

// ========================================
// 主组件
// ========================================

export const INTLProfileCard: React.FC<INTLProfileCardProps> = ({
  user,
  onLike,
  onChat,
  onViewProfile,
  showActions = true,
  className,
}) => {
  const { language } = useLanguage();
  const t = useTranslations(language);

  const getCompatibilityColor = (score?: number) => {
    if (!score) return 'bg-gray-400';
    if (score >= 90) return 'bg-gradient-to-r from-pink-500 to-rose-500';
    if (score >= 75) return 'bg-gradient-to-r from-purple-500 to-violet-500';
    if (score >= 60) return 'bg-gradient-to-r from-blue-500 to-cyan-500';
    return 'bg-gradient-to-r from-amber-500 to-orange-500';
  };

  const getCompatibilityLabel = (score?: number) => {
    if (!score) return '';
    if (score >= 90) return language === 'zh' ? '绝佳匹配' : 'Perfect Match';
    if (score >= 75) return language === 'zh' ? '很好匹配' : 'Great Match';
    if (score >= 60) return language === 'zh' ? '不错匹配' : 'Good Match';
    return language === 'zh' ? '一般匹配' : 'Fair Match';
  };

  return (
    <Card 
      className={cn(
        "intl-profile-card group relative overflow-hidden transition-all duration-300",
        "hover:shadow-xl hover:-translate-y-1",
        className
      )}
    >
      {/* 顶部渐变条 */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
      
      {/* 头像区域 */}
      <div className="relative">
        <div className="aspect-[4/5] overflow-hidden">
          <Image
            src={user.avatarUrl || "/placeholder-avatar.jpg"}
            alt={user.name}
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
        
        {/* 渐变遮罩 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        
        {/* 用户基本信息 */}
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <div className="flex items-end justify-between">
            <div>
              <h3 className="text-2xl font-bold">
                {user.name}, {user.age}
              </h3>
              
              {user.cityName && (
                <div className="flex items-center gap-1 mt-1 text-white/80 text-sm">
                  <MapPin className="w-4 h-4" />
                  <span>{user.cityName}</span>
                </div>
              )}
            </div>
            
            {/* 兼容性分数 */}
            {user.compatibilityScore && (
              <div className={cn(
                "px-3 py-1.5 rounded-full text-white text-sm font-semibold",
                getCompatibilityColor(user.compatibilityScore)
              )}>
                {user.compatibilityScore}%
              </div>
            )}
          </div>
        </div>
        
        {/* MBTI标签 */}
        {user.mbti && (
          <Badge 
            className="absolute top-4 right-4 bg-white/90 text-violet-600 font-semibold backdrop-blur-sm"
          >
            {user.mbti}
          </Badge>
        )}
      </div>
      
      <CardContent className="p-4 space-y-4">
        {/* 基本信息行 */}
        <div className="flex flex-wrap gap-2">
          {user.occupation && (
            <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
              <Briefcase className="w-4 h-4 text-violet-500" />
              <span>{user.occupation}</span>
            </div>
          )}
          
          {user.educationLevel && (
            <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
              <GraduationCap className="w-4 h-4 text-violet-500" />
              <span>{String(t.profileSetup?.[`education_${user.educationLevel}` as keyof typeof t.profileSetup] || user.educationLevel)}</span>
            </div>
          )}
        </div>
        
        {/* 个人简介 */}
        {user.bio && (
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {user.bio}
          </p>
        )}
        
        {/* 兴趣标签 */}
        {user.interests && user.interests.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {user.interests.slice(0, 4).map((interest, index) => (
              <Badge 
                key={index} 
                variant="secondary" 
                className="text-xs bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
              >
                {interest}
              </Badge>
            ))}
            {user.interests.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{user.interests.length - 4}
              </Badge>
            )}
          </div>
        )}
        
        {/* 兼容性标签 */}
        {user.compatibilityScore && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-violet-50 dark:bg-violet-900/20">
            <Sparkles className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-medium text-violet-700 dark:text-violet-300">
              {getCompatibilityLabel(user.compatibilityScore)}
            </span>
          </div>
        )}
        
        {/* 操作按钮 */}
        {showActions && (
          <div className="flex gap-2 pt-2">
            {onLike && (
              <Button 
                variant="outline" 
                size="sm"
                className="flex-1 border-rose-200 text-rose-500 hover:bg-rose-50 hover:border-rose-300"
                onClick={() => onLike(user.id)}
              >
                <Heart className="w-4 h-4 mr-1" />
                {language === 'zh' ? '喜欢' : 'Like'}
              </Button>
            )}
            
            {onChat && (
              <Button 
                size="sm"
                className="flex-1 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white"
                onClick={() => onChat(user.id)}
              >
                <MessageCircle className="w-4 h-4 mr-1" />
                {language === 'zh' ? '聊天' : 'Chat'}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default INTLProfileCard;

