import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  CreditCard,
  TrendingUp,
  TrendingDown,
  Plus,
  History,
  Gift
} from 'lucide-react'
import { useLanguage } from '@/components/language-provider'

const TRANSLATIONS = {
  zh: {
    unableToLoad: '无法加载余额信息',
    creditBalance: '积分余额',
    currentCredits: '当前可用积分',
    totalEarned: '总获得',
    totalSpent: '总消费',
    usageRate: '使用率',
    vipMember: 'VIP会员',
    premiumMember: '高级会员',
    freeUser: '免费用户',
    claimDaily: '领取每日奖励',
    recharge: '充值积分',
    history: '消费记录',
    nextBonus: '下次奖励时间:',
  },
  en: {
    unableToLoad: 'Unable to load balance info',
    creditBalance: 'Credit Balance',
    currentCredits: 'Current Available Credits',
    totalEarned: 'Total Earned',
    totalSpent: 'Total Spent',
    usageRate: 'Usage Rate',
    vipMember: 'VIP Member',
    premiumMember: 'Premium Member',
    freeUser: 'Free User',
    claimDaily: 'Claim Daily Bonus',
    recharge: 'Recharge Credits',
    history: 'Transaction History',
    nextBonus: 'Next bonus time:',
  },
};

interface CreditBalance {
  current: number
  total_earned: number
  total_spent: number
  daily_bonus_available: boolean
  next_bonus_time?: string
  membership_level: 'free' | 'premium' | 'vip'
  membership_benefits: string[]
}

interface CreditBalanceCardProps {
  userId: string
}

export default function CreditBalanceCard({ userId }: CreditBalanceCardProps) {
  const [balance, setBalance] = useState<CreditBalance | null>(null)
  const [loading, setLoading] = useState(true)
  const { language } = useLanguage()
  const t = TRANSLATIONS[language] || TRANSLATIONS.zh

  useEffect(() => {
    fetchCreditBalance()
  }, [userId])

  const fetchCreditBalance = async () => {
    try {
      const response = await fetch(`/api/user/credits`, { cache: 'no-store' })
      if (response.ok) {
        const data = await response.json()
        setBalance(data)
      }
    } catch (error) {
      console.error('Failed to fetch credit balance:', error)
    } finally {
      setLoading(false)
    }
  }

  const claimDailyBonus = async () => {
    try {
      const response = await fetch('/api/user/credits/daily-bonus', {
        method: 'POST'
      })
      if (response.ok) {
        // 刷新余额数据
        fetchCreditBalance()
      }
    } catch (error) {
      console.error('Failed to claim daily bonus:', error)
    }
  }

  const getMembershipColor = (level: string) => {
    switch (level) {
      case 'vip':
        return 'text-purple-500'
      case 'premium':
        return 'text-blue-500'
      default:
        return 'text-gray-500'
    }
  }

  const getMembershipIcon = (level: string) => {
    switch (level) {
      case 'vip':
        return '👑'
      case 'premium':
        return '⭐'
      default:
        return '🎯'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!balance) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">{t.unableToLoad}</p>
        </CardContent>
      </Card>
    )
  }

  const usagePercentage = balance.total_earned > 0
    ? (balance.total_spent / balance.total_earned) * 100
    : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CreditCard className="h-5 w-5" />
          <span>{t.creditBalance}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 当前余额 */}
        <div className="text-center">
          <div className="text-3xl font-bold text-primary">
            {balance.current.toLocaleString()}
          </div>
          <p className="text-sm text-muted-foreground">{t.currentCredits}</p>
        </div>

        {/* 使用统计 */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{t.totalEarned}</span>
            <span className="flex items-center text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              {balance.total_earned.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span>{t.totalSpent}</span>
            <span className="flex items-center text-red-600">
              <TrendingDown className="h-3 w-3 mr-1" />
              {balance.total_spent.toLocaleString()}
            </span>
          </div>

          {/* 使用进度条 */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t.usageRate}</span>
              <span>{usagePercentage.toFixed(1)}%</span>
            </div>
            <Progress value={usagePercentage} className="h-2" />
          </div>
        </div>

        {/* 会员等级 */}
        <div className="p-3 bg-muted rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-lg">{getMembershipIcon(balance.membership_level)}</span>
            <span className={`font-medium ${getMembershipColor(balance.membership_level)}`}>
              {balance.membership_level === 'vip' ? t.vipMember :
               balance.membership_level === 'premium' ? t.premiumMember : t.freeUser}
            </span>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            {balance.membership_benefits.map((benefit, index) => (
              <div key={index} className="flex items-center">
                <Gift className="h-3 w-3 mr-1" />
                {benefit}
              </div>
            ))}
          </div>
        </div>

        {/* 每日奖励 */}
        {balance.daily_bonus_available && (
          <Button
            onClick={claimDailyBonus}
            className="w-full"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t.claimDaily}
          </Button>
        )}

        {/* 操作按钮 */}
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full"
            size="sm"
            asChild
          >
            <a href="/payment/recharge">
              <Plus className="h-4 w-4 mr-2" />
              {t.recharge}
            </a>
          </Button>

          <Button
            variant="ghost"
            className="w-full"
            size="sm"
            asChild
          >
            <a href="/dashboard/billing">
              <History className="h-4 w-4 mr-2" />
              {t.history}
            </a>
          </Button>
        </div>

        {/* 下次奖励时间 */}
        {balance.next_bonus_time && !balance.daily_bonus_available && (
          <div className="text-xs text-muted-foreground text-center">
            {t.nextBonus} {new Date(balance.next_bonus_time).toLocaleString()}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 