import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  MoreVertical, 
  Phone, 
  Video, 
  User, 
  Ban,
  Flag
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ChatHeaderProps {
  chatId: string
  participant: {
    id: string
    full_name: string
    avatar_url?: string
    online?: boolean
    last_seen?: string
  }
}

export default function ChatHeader({ chatId, participant }: ChatHeaderProps) {
  const [isOnline, setIsOnline] = useState(participant.online || false)

  const handleCall = () => {
    // 实现语音通话功能
    console.log('Initiating voice call with', participant.id)
  }

  const handleVideoCall = () => {
    // 实现视频通话功能
    console.log('Initiating video call with', participant.id)
  }

  const handleViewProfile = () => {
    // 查看用户资料
    window.open(`/user/${participant.id}`, '_blank')
  }

  const handleBlock = () => {
    // 屏蔽用户
    console.log('Blocking user', participant.id)
  }

  const handleReport = () => {
    // 举报用户
    console.log('Reporting user', participant.id)
  }

  return (
    <div className="flex items-center justify-between p-4 border-b bg-background">
      <div className="flex items-center space-x-3">
        <div className="relative">
          <Avatar className="h-10 w-10">
            <AvatarImage src={participant.avatar_url} />
            <AvatarFallback>
              {participant.full_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {isOnline && (
            <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
          )}
        </div>
        
        <div>
          <h3 className="font-semibold text-foreground">
            {participant.full_name}
          </h3>
          <div className="flex items-center space-x-2">
            <Badge 
              variant={isOnline ? "default" : "secondary"} 
              className="text-xs"
            >
              {isOnline ? '在线' : '离线'}
            </Badge>
            {!isOnline && participant.last_seen && (
              <span className="text-xs text-muted-foreground">
                最后在线: {new Date(participant.last_seen).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCall}
          title="语音通话"
        >
          <Phone className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={handleVideoCall}
          title="视频通话"
        >
          <Video className="h-4 w-4" />
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleViewProfile}>
              <User className="mr-2 h-4 w-4" />
              查看资料
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleBlock} className="text-destructive">
              <Ban className="mr-2 h-4 w-4" />
              屏蔽用户
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleReport} className="text-destructive">
              <Flag className="mr-2 h-4 w-4" />
              举报用户
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
} 