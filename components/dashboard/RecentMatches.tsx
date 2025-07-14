import { useEffect, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { MessageSquare, Heart, MapPin, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Match {
  id: string
  full_name: string
  avatar_url?: string
  age?: number
  location?: string
  compatibility: number
  last_activity: string
  is_online: boolean
}

interface RecentMatchesProps {
  userId: string
}

export default function RecentMatches({ userId }: RecentMatchesProps) {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecentMatches()
  }, [userId])

  const fetchRecentMatches = async () => {
    try {
      const response = await fetch(`/api/user/matches?limit=5`)
      if (response.ok) {
        const data = await response.json()
        setMatches(data.matches || [])
      }
    } catch (error) {
      console.error('Failed to fetch recent matches:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCompatibilityColor = (score: number) => {
    if (score >= 90) return 'bg-green-500'
    if (score >= 80) return 'bg-blue-500'
    if (score >= 70) return 'bg-yellow-500'
    return 'bg-gray-500'
  }

  const getCompatibilityText = (score: number) => {
    if (score >= 90) return '完美匹配'
    if (score >= 80) return '高度匹配'
    if (score >= 70) return '良好匹配'
    return '一般匹配'
  }

  const handleStartChat = (matchId: string) => {
    // 跳转到聊天页面
    window.location.href = `/chat/${matchId}`
  }

  const handleViewProfile = (matchId: string) => {
    // 跳转到用户资料页面
    window.open(`/user/${matchId}`, '_blank')
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-8 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (matches.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-muted-foreground">
            <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">暂无匹配</h3>
            <p className="text-sm mb-4">
              完善您的个人资料，开始寻找心仪的匹配
            </p>
            <Button asChild>
              <a href="/matching">开始匹配</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {matches.map((match) => (
        <Card key={match.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={match.avatar_url} />
                  <AvatarFallback>
                    {match.full_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {match.is_online && (
                  <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="font-medium truncate">
                    {match.full_name}
                    {match.age && <span className="text-muted-foreground ml-1">({match.age})</span>}
                  </h3>
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      'text-xs',
                      getCompatibilityColor(match.compatibility)
                    )}
                  >
                    {match.compatibility}%
                  </Badge>
                </div>
                
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  {match.location && (
                    <div className="flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      {match.location}
                    </div>
                  )}
                  <div className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    {new Date(match.last_activity).toLocaleDateString()}
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground mt-1">
                  {getCompatibilityText(match.compatibility)}
                </p>
              </div>
              
              <div className="flex flex-col space-y-2">
                <Button
                  size="sm"
                  onClick={() => handleStartChat(match.id)}
                  className="flex items-center"
                >
                  <MessageSquare className="h-3 w-3 mr-1" />
                  聊天
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewProfile(match.id)}
                >
                  查看资料
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {matches.length > 0 && (
        <div className="text-center pt-4">
          <Button variant="outline" asChild>
            <a href="/matching">查看全部匹配</a>
          </Button>
        </div>
      )}
    </div>
  )
} 