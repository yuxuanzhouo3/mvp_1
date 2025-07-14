import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/context/AuthProvider'
import { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

interface Message {
  id: string
  content: string
  sender_id: string
  created_at: string
  is_ai: boolean
  attachments?: string[]
  chat_id: string
}

interface ChatParticipant {
  user_id: string
  online_at: string
  last_seen: string
}

export default function useChatChannel(chatId: string) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)
  const [participants, setParticipants] = useState<ChatParticipant[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // 加载聊天历史
  const loadChatHistory = useCallback(async () => {
    if (!chatId) return

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })
        .limit(50) // 限制加载最近50条消息
      
      if (error) {
        console.error('Error loading chat history:', error)
        return
      }
      
      setMessages(data || [])
    } catch (error) {
      console.error('Failed to load chat history:', error)
    } finally {
      setIsLoading(false)
    }
  }, [chatId])

  // 初始化聊天通道
  useEffect(() => {
    if (!user || !chatId) return
    
    const chatChannel = supabase.channel(`chat_${chatId}`, {
      config: {
        presence: { key: user.id }
      }
    })
    
    chatChannel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = chatChannel.presenceState()
        const participants = Object.values(presenceState).flat().map(p => ({
          user_id: (p as any).user_id || p.presence_ref,
          online_at: (p as any).online_at || new Date().toISOString(),
          last_seen: new Date().toISOString()
        }))
        setParticipants(participants)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences)
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`
      }, (payload) => {
        const newMessage = payload.new as Message
        setMessages(prev => [...prev, newMessage])
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`
      }, (payload) => {
        const updatedMessage = payload.new as Message
        setMessages(prev => 
          prev.map(msg => 
            msg.id === updatedMessage.id ? updatedMessage : msg
          )
        )
      })
      .subscribe(async (status) => {
        console.log('Chat channel status:', status)
        setIsConnected(status === 'SUBSCRIBED')
        
        if (status === 'SUBSCRIBED') {
          await chatChannel.track({ 
            user_id: user.id, 
            online_at: new Date().toISOString() 
          })
          loadChatHistory()
        }
      })

    setChannel(chatChannel)

    return () => {
      chatChannel.unsubscribe()
      setIsConnected(false)
    }
  }, [chatId, user, loadChatHistory])

  // 发送消息
  const sendMessage = useCallback(async (
    content: string, 
    isAi: boolean = false, 
    attachments?: string[]
  ) => {
    if (!user || !channel || !content.trim()) return
    
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          content: content.trim(),
          sender_id: user.id,
          is_ai: isAi,
          attachments: attachments || []
        })
      
      if (error) {
        console.error('Message send error:', error)
        throw error
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      throw error
    }
  }, [user, channel, chatId])

  // 上传附件
  const uploadAttachment = useCallback(async (file: File): Promise<string> => {
    if (!user) throw new Error('User not authenticated')

    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}.${fileExt}`
    
    const { data, error } = await supabase.storage
      .from('chat-attachments')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (error) {
      console.error('Upload error:', error)
      throw error
    }
    
    // 返回公开URL
    const { data: { publicUrl } } = supabase.storage
      .from('chat-attachments')
      .getPublicUrl(data.path)
    
    return publicUrl
  }, [user])

  // 删除消息
  const deleteMessage = useCallback(async (messageId: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', user.id) // 只能删除自己的消息
      
      if (error) {
        console.error('Message delete error:', error)
        throw error
      }
    } catch (error) {
      console.error('Failed to delete message:', error)
      throw error
    }
  }, [user])

  // 标记消息为已读
  const markAsRead = useCallback(async (messageIds: string[]) => {
    if (!user || messageIds.length === 0) return

    try {
      const { error } = await supabase
        .from('message_reads')
        .upsert(
          messageIds.map(id => ({
            message_id: id,
            user_id: user.id,
            read_at: new Date().toISOString()
          }))
        )
      
      if (error) {
        console.error('Mark as read error:', error)
      }
    } catch (error) {
      console.error('Failed to mark messages as read:', error)
    }
  }, [user])

  return { 
    messages, 
    participants,
    sendMessage, 
    uploadAttachment,
    deleteMessage,
    markAsRead,
    isConnected,
    isLoading
  }
} 