import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  MessageSquare, 
  Heart, 
  CreditCard, 
  User, 
  Settings,
  Calendar,
  Clock
} from 'lucide-react'

interface Activity {
  id: string
  type: 'message' | 'match' | 'payment' | 'profile_update' | 'login'
  title: string
  description: string
  timestamp: string
  metadata?: Record<string, any>
}

interface ActivityTimelineProps {
  userId: string
}

export default function ActivityTimeline({ userId }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchActivities()
  }, [userId])

  const fetchActivities = async () => {
    try {
      const response = await fetch(`/api/user/activities?limit=10`)
      if (response.ok) {
        const data = await response.json()
        setActivities(data.activities || [])
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="h-4 w-4" />
      case 'match':
        return <Heart className="h-4 w-4" />
      case 'payment':
        return <CreditCard className="h-4 w-4" />
      case 'profile_update':
        return <User className="h-4 w-4" />
      case 'login':
        return <Settings className="h-4 w-4" />
      default:
        return <Calendar className="h-4 w-4" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'message':
        return 'bg-blue-500'
      case 'match':
        return 'bg-pink-500'
      case 'payment':
        return 'bg-green-500'
      case 'profile_update':
        return 'bg-purple-500'
      case 'login':
        return 'bg-gray-500'
      default:
        return 'bg-gray-400'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) {
      return '刚刚'
    } else if (diffInHours < 24) {
      return `${diffInHours}小时前`
    } else if (diffInHours < 168) { // 7 days
      return `${Math.floor(diffInHours / 24)}天前`
    } else {
      return date.toLocaleDateString()
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-start space-x-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">暂无活动</h3>
            <p className="text-sm">
              开始使用应用，您的活动将在这里显示
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {activities.map((activity, index) => (
        <div key={activity.id} className="flex items-start space-x-4">
          {/* 时间线连接线 */}
          {index < activities.length - 1 && (
            <div className="absolute left-4 top-8 w-0.5 h-8 bg-border" />
          )}
          
          {/* 活动图标 */}
          <div className={`
            relative flex items-center justify-center w-8 h-8 rounded-full text-white
            ${getActivityColor(activity.type)}
          `}>
            {getActivityIcon(activity.type)}
          </div>
          
          {/* 活动内容 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="font-medium text-sm">{activity.title}</h4>
              <Badge variant="secondary" className="text-xs">
                {activity.type}
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground mb-2">
              {activity.description}
            </p>
            
            <div className="flex items-center text-xs text-muted-foreground">
              <Clock className="h-3 w-3 mr-1" />
              {formatTimestamp(activity.timestamp)}
            </div>
            
            {/* 活动元数据 */}
            {activity.metadata && Object.keys(activity.metadata).length > 0 && (
              <div className="mt-2 p-2 bg-muted rounded-md">
                {Object.entries(activity.metadata).map(([key, value]) => (
                  <div key={key} className="text-xs">
                    <span className="font-medium">{key}:</span> {String(value)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
      
      {activities.length > 0 && (
        <div className="text-center pt-4">
          <Button variant="outline" size="sm" asChild>
            <a href="/dashboard/history">查看全部活动</a>
          </Button>
        </div>
      )}
    </div>
  )
} 