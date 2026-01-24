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
import { useTranslations } from '@/lib/i18n'

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
  const t = useTranslations(language)

  useEffect(() => {
    fetchCreditBalance()
  }, [userId])

  const fetchCreditBalance = async () => {
    try {
      const response = await fetch(`/api/credits`, { cache: 'no-store', credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        if (data?.success && data?.data && typeof data.data.balance === 'number') {
          setBalance({
            current: data.data.balance,
            total_earned: data.data.balance,
            total_spent: 0,
            daily_bonus_available: false,
            membership_level: 'free',
            membership_benefits: [],
          })
        }
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
          <p className="text-muted-foreground">{t.creditBalance.unableToLoad}</p>
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
          <span>{t.creditBalance.creditBalance}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 当前余额 */}
        <div className="text-center">
          <div className="text-3xl font-bold text-primary">
            {balance.current.toLocaleString()}
          </div>
          <p className="text-sm text-muted-foreground">{t.creditBalance.currentCredits}</p>
        </div>

        {/* 使用统计 */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{t.creditBalance.totalEarned}</span>
            <span className="flex items-center text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              {balance.total_earned.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span>{t.creditBalance.totalSpent}</span>
            <span className="flex items-center text-red-600">
              <TrendingDown className="h-3 w-3 mr-1" />
              {balance.total_spent.toLocaleString()}
            </span>
          </div>

          {/* 使用进度条 */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t.creditBalance.usageRate}</span>
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
              {balance.membership_level === 'vip' ? t.creditBalance.vipMember :
               balance.membership_level === 'premium' ? t.creditBalance.premiumMember : t.creditBalance.freeUser}
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
            {t.creditBalance.claimDaily}
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
              {t.creditBalance.recharge}
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
              {t.creditBalance.history}
            </a>
          </Button>
        </div>

        {/* 下次奖励时间 */}
        {balance.next_bonus_time && !balance.daily_bonus_available && (
          <div className="text-xs text-muted-foreground text-center">
            {t.creditBalance.nextBonus} {new Date(balance.next_bonus_time).toLocaleString()}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 
