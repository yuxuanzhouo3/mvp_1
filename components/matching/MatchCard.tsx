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
  Users
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface MatchCardProps {
  user: {
    id: string
    full_name: string
    avatar_url?: string
    age?: number
    location?: string
    industry?: string
    bio?: string
    interests?: string[]
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
    if (score >= 90) return '完美匹配'
    if (score >= 80) return '高度匹配'
    if (score >= 70) return '良好匹配'
    return '一般匹配'
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
                  {user.age && <span className="text-lg font-normal ml-2">{user.age}岁</span>}
                </h3>
                
                <div className="flex items-center space-x-2 text-sm opacity-90">
                  {user.location && (
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {user.location}
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
                    <h4 className="text-sm font-medium mb-2">兴趣爱好</h4>
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
                    <h4 className="text-sm font-medium mb-2">性格类型</h4>
                    <Badge variant="outline">{user.personality_traits.mbti}</Badge>
                  </div>
                )}
                
                {/* 兼容性详情 */}
                <div>
                  <h4 className="text-sm font-medium mb-2">匹配详情</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>性格匹配</span>
                      <span className={getCompatibilityColor(compatibility)}>
                        {Math.round(compatibility * 0.4)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>兴趣匹配</span>
                      <span className={getCompatibilityColor(compatibility)}>
                        {Math.round(compatibility * 0.3)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>价值观匹配</span>
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