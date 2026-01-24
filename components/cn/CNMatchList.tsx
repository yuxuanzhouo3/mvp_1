/**
 * CN版匹配列表组件
 * 家长视角的匹配列表展示
 */

'use client';

import { memo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';
import { CNProfileCard } from './CNProfileCard';
import { 
  ChevronRight, 
  Filter,
  SortDesc,
  RefreshCw,
  Users
} from 'lucide-react';

// ========================================
// 类型定义
// ========================================

interface MatchCandidate {
  userId: string;
  username: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  avatarUrl?: string;
  education?: string;
  school?: string;
  occupation?: string;
  companyType?: string;
  annualIncome?: string;
  hometown?: string;
  city?: string;
  hasHouse?: boolean;
  hasCar?: boolean;
  parentOccupation?: string;
  familyBackground?: string;
  maritalStatus?: string;
  childrenPreference?: string;
  matchScore: number;
}

interface CNMatchListProps {
  /** 匹配候选人列表 */
  candidates: MatchCandidate[];
  /** 是否加载中 */
  isLoading?: boolean;
  /** 刷新回调 */
  onRefresh?: () => void;
  /** 筛选回调 */
  onFilter?: () => void;
  /** 喜欢回调 */
  onLike?: (userId: string) => void;
  /** 聊天回调 */
  onChat?: (userId: string) => void;
  /** 查看详情回调 */
  onViewDetails?: (userId: string) => void;
  /** 排序方式 */
  sortBy?: 'score' | 'age' | 'income';
  /** 排序方式变更回调 */
  onSortChange?: (sortBy: 'score' | 'age' | 'income') => void;
  /** 自定义类名 */
  className?: string;
}

// ========================================
// 骨架屏组件
// ========================================

function MatchCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="bg-gray-200 h-32 animate-pulse" />
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
        </div>
      </CardContent>
    </Card>
  );
}

// ========================================
// 排序按钮组件
// ========================================

interface SortButtonProps {
  label: string;
  value: 'score' | 'age' | 'income';
  currentSort: 'score' | 'age' | 'income';
  onChange: (value: 'score' | 'age' | 'income') => void;
}

function SortButton({ label, value, currentSort, onChange }: SortButtonProps) {
  const isActive = currentSort === value;
  
  return (
    <Button
      variant={isActive ? "default" : "outline"}
      size="sm"
      onClick={() => onChange(value)}
      className={cn(
        "text-sm",
        isActive && "cn-btn-primary"
      )}
    >
      {label}
      {isActive && <SortDesc className="w-3 h-3 ml-1" />}
    </Button>
  );
}

// ========================================
// 主组件
// ========================================

function CNMatchListComponent({
  candidates,
  isLoading = false,
  onRefresh,
  onFilter,
  onLike,
  onChat,
  onViewDetails,
  sortBy = 'score',
  onSortChange,
  className
}: CNMatchListProps) {
  const { language } = useLanguage();
  const t = useTranslations(language);
  const [currentSort, setCurrentSort] = useState<'score' | 'age' | 'income'>(sortBy);

  const handleSortChange = (value: 'score' | 'age' | 'income') => {
    setCurrentSort(value);
    onSortChange?.(value);
  };

  // 对候选人进行排序
  const sortedCandidates = [...candidates].sort((a, b) => {
    switch (currentSort) {
      case 'score':
        return b.matchScore - a.matchScore;
      case 'age':
        return a.age - b.age;
      case 'income':
        // 收入排序需要映射到数值
        const incomeOrder: Record<string, number> = {
          'below_50k': 1,
          '50k_100k': 2,
          '100k_200k': 3,
          '200k_500k': 4,
          '500k_1m': 5,
          'above_1m': 6
        };
        return (incomeOrder[b.annualIncome || ''] || 0) - (incomeOrder[a.annualIncome || ''] || 0);
      default:
        return 0;
    }
  });

  return (
    <div className={cn("theme-cn", className)}>
      {/* 头部工具栏 */}
      <Card className="cn-card mb-6">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-red-500" />
              <CardTitle className="text-xl">门当户对推荐</CardTitle>
              <Badge className="cn-badge-gold">
                {candidates.length} 位候选人
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              {onFilter && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onFilter}
                  className="cn-btn"
                >
                  <Filter className="w-4 h-4 mr-1" />
                  筛选
                </Button>
              )}
              {onRefresh && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  disabled={isLoading}
                  className="cn-btn"
                >
                  <RefreshCw className={cn("w-4 h-4 mr-1", isLoading && "animate-spin")} />
                  刷新
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          {/* 排序选项 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 mr-2">排序：</span>
            <SortButton 
              label="匹配度" 
              value="score" 
              currentSort={currentSort}
              onChange={handleSortChange}
            />
            <SortButton 
              label="年龄" 
              value="age" 
              currentSort={currentSort}
              onChange={handleSortChange}
            />
            <SortButton 
              label="收入" 
              value="income" 
              currentSort={currentSort}
              onChange={handleSortChange}
            />
          </div>
        </CardContent>
      </Card>

      {/* 候选人列表 */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <MatchCardSkeleton key={i} />
          ))}
        </div>
      ) : candidates.length === 0 ? (
        <Card className="cn-card text-center py-12">
          <CardContent>
            <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">暂无推荐</h3>
            <p className="text-gray-500 mb-4">
              系统正在为您的子女寻找门当户对的对象
            </p>
            {onRefresh && (
              <Button onClick={onRefresh} className="cn-btn cn-btn-primary">
                刷新推荐
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedCandidates.map(candidate => (
            <CNProfileCard
              key={candidate.userId}
              {...candidate}
              onLike={() => onLike?.(candidate.userId)}
              onChat={() => onChat?.(candidate.userId)}
              onViewDetails={() => onViewDetails?.(candidate.userId)}
            />
          ))}
        </div>
      )}

      {/* 加载更多提示 */}
      {!isLoading && candidates.length > 0 && (
        <div className="text-center mt-8">
          <p className="text-gray-500 text-sm">
            已展示所有推荐 · 每日为您更新门当户对的好对象
          </p>
        </div>
      )}
    </div>
  );
}

export const CNMatchList = memo(CNMatchListComponent);
export default CNMatchList;

