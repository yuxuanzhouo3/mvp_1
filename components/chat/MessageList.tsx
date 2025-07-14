import { useEffect, useRef, useState } from 'react'
import { useChat } from '@/hooks/useChat'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Check, 
  CheckCheck, 
  Clock, 
  AlertCircle,
  Download,
  Image as ImageIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  content: string
  sender_id: string
  recipient_id: string
  type: 'text' | 'image' | 'file'
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
  created_at: string
  file_url?: string
  file_name?: string
  file_size?: number
}

interface MessageListProps {
  chatId: string
  initialMessages: Message[]
  userId: string
}

export default function MessageList({ 
  chatId, 
  initialMessages, 
  userId 
}: MessageListProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const { messages: realtimeMessages, sendMessage } = useChat(chatId)

  useEffect(() => {
    if (realtimeMessages) {
      setMessages(realtimeMessages)
    }
  }, [realtimeMessages])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const getMessageStatusIcon = (status: string) => {
    switch (status) {
      case 'sending':
        return <Clock className="h-3 w-3 text-muted-foreground" />
      case 'sent':
        return <Check className="h-3 w-3 text-muted-foreground" />
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-muted-foreground" />
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-500" />
      case 'failed':
        return <AlertCircle className="h-3 w-3 text-red-500" />
      default:
        return null
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const renderMessageContent = (message: Message) => {
    switch (message.type) {
      case 'image':
        return (
          <div className="space-y-2">
            <img 
              src={message.file_url} 
              alt="Image" 
              className="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(message.file_url, '_blank')}
            />
            {message.content && (
              <p className="text-sm">{message.content}</p>
            )}
          </div>
        )
      
      case 'file':
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
              <Download className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {message.file_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(message.file_size || 0)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(message.file_url, '_blank')}
              >
                下载
              </Button>
            </div>
            {message.content && (
              <p className="text-sm">{message.content}</p>
            )}
          </div>
        )
      
      default:
        return <p className="text-sm whitespace-pre-wrap">{message.content}</p>
    }
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex space-x-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-16 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => {
        const isOwnMessage = message.sender_id === userId
        
        return (
          <div
            key={message.id}
            className={cn(
              'flex space-x-3',
              isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''
            )}
          >
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src={message.sender_id === userId ? undefined : undefined} />
              <AvatarFallback>
                {message.sender_id === userId ? '我' : 'U'}
              </AvatarFallback>
            </Avatar>
            
            <div className={cn(
              'flex-1 max-w-xs lg:max-w-md',
              isOwnMessage ? 'text-right' : ''
            )}>
              <div className={cn(
                'inline-block p-3 rounded-lg',
                isOwnMessage 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted'
              )}>
                {renderMessageContent(message)}
              </div>
              
              <div className={cn(
                'flex items-center space-x-1 mt-1 text-xs text-muted-foreground',
                isOwnMessage ? 'justify-end' : 'justify-start'
              )}>
                <span>
                  {new Date(message.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
                {isOwnMessage && getMessageStatusIcon(message.status)}
              </div>
            </div>
          </div>
        )
      })}
      
      <div ref={messagesEndRef} />
    </div>
  )
} 