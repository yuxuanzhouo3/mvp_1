'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers/AuthProvider';
import { useChat } from '@/app/hooks/useChat';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Send, 
  Paperclip, 
  Image, 
  File, 
  Smile,
  MoreVertical,
  Phone,
  Video,
  ArrowLeft,
  Search,
  MessageSquare
} from 'lucide-react';

interface ChatMessage {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  message_type: 'text' | 'image' | 'file';
  file_url?: string;
  created_at: string;
  is_read: boolean;
}

interface ChatUser {
  id: string;
  full_name: string;
  avatar_url?: string;
  is_online: boolean;
  last_seen?: string;
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const chatId = params.chatId as string;
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatUser, setChatUser] = useState<ChatUser | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showFileUpload, setShowFileUpload] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Initialize chat hook
  const { sendMessage, isConnected } = useChat(chatId);

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    loadChatData();
  }, [chatId, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChatData = async () => {
    try {
      setIsLoading(true);
      
      // Load chat messages
      const messagesResponse = await fetch(`/api/chat/${chatId}/messages`);
      if (messagesResponse.ok) {
        const messagesData = await messagesResponse.json();
        setMessages(messagesData.messages);
      }

      // Load chat user info
      const userResponse = await fetch(`/api/chat/${chatId}/user`);
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setChatUser(userData.user);
      }
    } catch (error) {
      toast({
        title: '加载失败',
        description: '无法加载聊天数据',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !isConnected) return;

    try {
      await sendMessage(newMessage);
      setNewMessage('');
    } catch (error) {
      toast({
        title: '发送失败',
        description: '消息发送失败，请重试',
        variant: 'destructive',
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('chatId', chatId);

      const response = await fetch('/api/chat/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        await sendMessage('', 'file', data.file_url);
        toast({
          title: '文件上传成功',
          description: '文件已发送',
        });
      }
    } catch (error) {
      toast({
        title: '上传失败',
        description: '文件上传失败，请重试',
        variant: 'destructive',
      });
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('chatId', chatId);

      const response = await fetch('/api/chat/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        await sendMessage('', 'image', data.image_url);
        toast({
          title: '图片上传成功',
          description: '图片已发送',
        });
      }
    } catch (error) {
      toast({
        title: '上传失败',
        description: '图片上传失败，请重试',
        variant: 'destructive',
      });
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">加载聊天中...</p>
        </div>
      </div>
    );
  }

  if (!chatUser) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>聊天未找到</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/chat')} className="w-full">
              返回聊天列表
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Chat Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push('/chat')}
              className="lg:hidden"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            <Avatar>
              <AvatarImage src={chatUser.avatar_url} />
              <AvatarFallback>
                {chatUser.full_name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">
                {chatUser.full_name}
              </h2>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${chatUser.is_online ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {chatUser.is_online ? '在线' : '离线'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              <Search className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Phone className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Video className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              开始与 {chatUser.full_name} 的对话
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              发送第一条消息来开始聊天
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.sender_id === user?.id;
            
            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-end space-x-2 max-w-xs lg:max-w-md ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  {!isOwnMessage && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={chatUser.avatar_url} />
                      <AvatarFallback>
                        {chatUser.full_name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className={`rounded-lg px-4 py-2 ${
                    isOwnMessage 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                  }`}>
                    {message.message_type === 'text' && (
                      <p className="text-sm">{message.content}</p>
                    )}
                    
                    {message.message_type === 'image' && (
                      <img 
                        src={message.file_url} 
                        alt="Shared image" 
                        className="rounded max-w-full h-auto"
                      />
                    )}
                    
                    {message.message_type === 'file' && (
                      <div className="flex items-center space-x-2">
                        <File className="h-4 w-4" />
                        <span className="text-sm">文件已发送</span>
                      </div>
                    )}
                    
                    <div className={`text-xs mt-1 ${
                      isOwnMessage ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {formatTime(message.created_at)}
                      {isOwnMessage && (
                        <span className="ml-2">
                          {message.is_read ? '✓✓' : '✓'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex items-end space-x-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={chatUser.avatar_url} />
                <AvatarFallback>
                  {chatUser.full_name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFileUpload(!showFileUpload)}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          
          {showFileUpload && (
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => imageInputRef.current?.click()}
              >
                <Image className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <File className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          <div className="flex-1">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入消息..."
              className="border-0 focus:ring-0"
            />
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {/* Emoji picker */}}
          >
            <Smile className="h-4 w-4" />
          </Button>
          
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || !isConnected}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        {!isConnected && (
          <div className="mt-2 text-center">
            <Badge variant="destructive" className="text-xs">
              连接断开，正在重连...
            </Badge>
          </div>
        )}
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileUpload}
        accept=".pdf,.doc,.docx,.txt"
      />
      <input
        ref={imageInputRef}
        type="file"
        className="hidden"
        onChange={handleImageUpload}
        accept="image/*"
      />
    </div>
  );
} 