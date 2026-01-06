import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Heart,
  X,
  Star,
  MessageSquare,
  MapPin,
  Calendar,
  Briefcase,
  Users,
  DollarSign,
  EyeOff
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/components/language-provider'
import { useTranslations } from '@/lib/i18n'

interface MatchCardProps {
  user: {
    id: string
    full_name: string
    avatar_url?: string
    age?: number
    location?: string
    city_name?: string
    industry?: string
    bio?: string
    interests?: string[]
    annual_income_range?: string | null
    income_hidden?: boolean
    location_hidden?: boolean
    personality_traits?: {
      mbti?: string
      big_five?: {
        openness: number
        conscientiousness: number
        extraversion: number
        agreeableness: number
        neuroticism: number
      }
    }
  }
  compatibility: number
  onLike?: (userId: string) => void
  onPass?: (userId: string) => void
  onSuperLike?: (userId: string) => void
}

export default function MatchCard({
  user,
  compatibility,
  onLike,
  onPass,
  onSuperLike
}: MatchCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const { language } = useLanguage()
  const t = useTranslations(language)

  // Get display location (city_name is always visible, exact location may be hidden)
  const displayLocation = user.city_name || user.location || ''

  const handleAction = (action: 'like' | 'pass' | 'superLike') => {
    setIsAnimating(true)
    
    setTimeout(() => {
      switch (action) {
        case 'like':
          onLike?.(user.id)
          break
        case 'pass':
          onPass?.(user.id)
          break
        case 'superLike':
          onSuperLike?.(user.id)
          break
      }
      setIsAnimating(false)
    }, 300)
  }

  const getCompatibilityColor = (score: number) => {
    if (score >= 90) return 'text-green-500'
    if (score >= 80) return 'text-blue-500'
    if (score >= 70) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getCompatibilityText = (score: number) => {
    if (score >= 90) return t.matching?.perfectMatch || 'Perfect Match'
    if (score >= 80) return t.matching?.highMatch || 'High Match'
    if (score >= 70) return t.matching?.goodMatch || 'Good Match'
    return t.matching?.averageMatch || 'Average Match'
  }

  return (
    <div className="relative w-full max-w-sm mx-auto">
      <Card 
        className={cn(
          'relative overflow-hidden transition-all duration-300 cursor-pointer',
          isAnimating && 'scale-95 opacity-50'
        )}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <CardContent className="p-0">
          {/* 正面 - 基本信息 */}
          <div className={cn(
            'transition-transform duration-500',
            isFlipped ? 'rotate-y-180 opacity-0' : 'rotate-y-0 opacity-100'
          )}>
            <div className="relative">
              <img
                src={user.avatar_url || '/default-avatar.jpg'}
                alt={user.full_name}
                className="w-full h-80 object-cover"
              />
              
              {/* 兼容性徽章 */}
              <div className="absolute top-4 right-4">
                <Badge className={cn(
                  'text-white font-semibold',
                  getCompatibilityColor(compatibility)
                )}>
                  {compatibility}%
                </Badge>
              </div>
              
              {/* 渐变遮罩 */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent h-32" />
              
              {/* 用户信息 */}
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <h3 className="text-xl font-bold mb-1">
                  {user.full_name}
                  {user.age && <span className="text-lg font-normal ml-2">{user.age}{language === 'zh' ? '岁' : ''}</span>}
                </h3>
                
                <div className="flex items-center space-x-2 text-sm opacity-90">
                  {displayLocation && (
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {displayLocation}
                      {user.location_hidden && (
                        <span title={t.privacy?.locationApproximate || 'Approximate location'}>
                          <EyeOff className="h-3 w-3 ml-1 opacity-60" />
                        </span>
                      )}
                    </div>
                  )}
                  {user.industry && (
                    <div className="flex items-center">
                      <Briefcase className="h-4 w-4 mr-1" />
                      {user.industry}
                    </div>
                  )}
                </div>
                
                {user.bio && (
                  <p className="text-sm mt-2 line-clamp-2 opacity-90">
                    {user.bio}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          {/* 背面 - 详细信息 */}
          <div className={cn(
            'absolute inset-0 bg-background transition-transform duration-500 p-6',
            isFlipped ? 'rotate-y-0 opacity-100' : 'rotate-y-180 opacity-0'
          )}>
            <div className="h-full flex flex-col">
              <div className="flex items-center space-x-3 mb-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback>
                    {user.full_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{user.full_name}</h3>
                  <p className={cn(
                    'text-sm font-medium',
                    getCompatibilityColor(compatibility)
                  )}>
                    {getCompatibilityText(compatibility)}
                  </p>
                </div>
              </div>
              
              <div className="flex-1 space-y-4">
                {/* 兴趣标签 */}
                {user.interests && user.interests.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">{t.matching?.interests || 'Interests'}</h4>
                    <div className="flex flex-wrap gap-1">
                      {user.interests.slice(0, 6).map((interest, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* 性格特征 */}
                {user.personality_traits?.mbti && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">{t.matching?.personalityType || 'Personality Type'}</h4>
                    <Badge variant="outline">{user.personality_traits.mbti}</Badge>
                  </div>
                )}

                {/* 收入信息 (根据隐私设置显示) */}
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    {t.matching?.income || 'Income'}
                  </h4>
                  {user.income_hidden ? (
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <EyeOff className="h-4 w-4" />
                      <span>{t.matching?.hidden || 'Hidden'}</span>
                    </div>
                  ) : user.annual_income_range ? (
                    <Badge variant="secondary">{user.annual_income_range}</Badge>
                  ) : (
                    <span className="text-sm text-gray-500">{t.matching?.notFilled || 'Not filled'}</span>
                  )}
                </div>

                {/* 兼容性详情 */}
                <div>
                  <h4 className="text-sm font-medium mb-2">{t.matching?.matchDetails || 'Match Details'}</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{t.matching?.personalityMatch || 'Personality'}</span>
                      <span className={getCompatibilityColor(compatibility)}>
                        {Math.round(compatibility * 0.4)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>{t.matching?.interestsMatch || 'Interests'}</span>
                      <span className={getCompatibilityColor(compatibility)}>
                        {Math.round(compatibility * 0.3)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>{t.matching?.valuesMatch || 'Values'}</span>
                      <span className={getCompatibilityColor(compatibility)}>
                        {Math.round(compatibility * 0.3)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* 操作按钮 */}
      <div className="flex justify-center space-x-4 mt-4">
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-full border-2 border-red-500 text-red-500 hover:bg-red-50"
          onClick={() => handleAction('pass')}
        >
          <X className="h-6 w-6" />
        </Button>
        
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-full border-2 border-blue-500 text-blue-500 hover:bg-blue-50"
          onClick={() => handleAction('superLike')}
        >
          <Star className="h-6 w-6" />
        </Button>
        
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-full border-2 border-green-500 text-green-500 hover:bg-green-50"
          onClick={() => handleAction('like')}
        >
          <Heart className="h-6 w-6" />
        </Button>
      </div>
    </div>
  )
} 