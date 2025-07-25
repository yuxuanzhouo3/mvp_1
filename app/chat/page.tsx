'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@supabase/supabase-js';
import { 
  MessageSquare, 
  Send, 
  ArrowLeft,
  User,
  Settings,
  LogOut,
  Menu,
  Home,
  Heart,
  CreditCard
} from 'lucide-react';

interface Chat {
  id: string;
  matched_user: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  last_message?: {
    content: string;
    created_at: string;
    sender_id: string;
  };
  unread_count: number;
  created_at: string;
}

export default function ChatPage() {
  const { user, signOut, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  
  // Create Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const loadChats = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        console.error('No session token available');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      const response = await fetch('/api/chat/list', { headers });
      if (response.ok) {
        const data = await response.json();
        setChats(data.chats || []);
      } else {
        console.error('Failed to load chats');
        toast({
          title: '加载失败',
          description: '无法加载聊天列表',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading chats:', error);
      toast({
        title: '加载失败',
        description: '网络错误，请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    
    if (!user || !user.id) {
      router.push('/auth/login');
      return;
    }
    
    loadChats();
  }, [user, authLoading]);

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = '/auth/login';
      toast({
        title: '已退出登录',
        description: '期待您的再次光临！',
      });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: '退出失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Back Button */}
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              返回
            </button>

            {/* Title */}
            <h1 className="text-xl font-bold text-gray-900">聊天</h1>

            {/* User Menu */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {user?.user_metadata?.full_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="text-sm font-medium text-gray-700 hidden sm:block">
                  {user?.user_metadata?.full_name || 'User'}
                </span>
              </div>
              
              <div className="relative">
                <button className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 transition-colors">
                  <Settings className="h-4 w-4" />
                </button>
                
                {/* Dropdown Menu */}
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 hidden group-hover:block">
                  <button
                    onClick={() => router.push('/dashboard/settings')}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    设置
                  </button>
                  <hr className="my-1" />
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    退出登录
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${showSidebar ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">PersonaLink</h2>
          <button
            onClick={() => setShowSidebar(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>
        
        <nav className="mt-4">
          <div className="px-4 space-y-2">
            <button
              onClick={() => { router.push('/dashboard'); setShowSidebar(false); }}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900"
            >
              <Home className="mr-3 h-5 w-5" />
              首页
            </button>
            <button
              onClick={() => { router.push('/chat'); setShowSidebar(false); }}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-blue-600 rounded-md bg-blue-50"
            >
              <MessageSquare className="mr-3 h-5 w-5" />
              聊天
            </button>
            <button
              onClick={() => { router.push('/matching'); setShowSidebar(false); }}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900"
            >
              <Heart className="mr-3 h-5 w-5" />
              匹配
            </button>
            <button
              onClick={() => { router.push('/payment/recharge'); setShowSidebar(false); }}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900"
            >
              <CreditCard className="mr-3 h-5 w-5" />
              充值
            </button>
            <button
              onClick={() => { router.push('/dashboard/settings'); setShowSidebar(false); }}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900"
            >
              <Settings className="mr-3 h-5 w-5" />
              设置
            </button>
          </div>
        </nav>
      </div>

      {/* Overlay */}
      {showSidebar && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Main Content */}
      <div className="pt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {chats.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">还没有聊天</h3>
              <p className="text-gray-600 mb-6">开始匹配来找到新的朋友吧！</p>
              <button
                onClick={() => router.push('/matching')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                开始匹配
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">聊天列表</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {chats.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => router.push(`/chat/${chat.id}`)}
                    className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {chat.matched_user.full_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {chat.matched_user.full_name}
                          </h3>
                          {chat.last_message && (
                            <p className="text-sm text-gray-600 truncate max-w-xs">
                              {chat.last_message.content}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {chat.last_message && (
                          <p className="text-xs text-gray-500">
                            {new Date(chat.last_message.created_at).toLocaleDateString()}
                          </p>
                        )}
                        {chat.unread_count > 0 && (
                          <div className="mt-1">
                            <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                              {chat.unread_count}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 