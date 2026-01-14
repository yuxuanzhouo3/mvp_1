'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers/AuthProvider';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { getSupabaseClient } from '@/lib/supabase/client';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import {
  MessageSquare,
  Search,
  Heart,
  ChevronRight
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
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const { language } = useLanguage();
  const t = useTranslations(language);

  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  // Use shared Supabase client singleton
  const supabase = getSupabaseClient();

  // Check admin status
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;
      try {
        const response = await fetch('/api/admin/check', { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          setIsAdmin(data.isAdmin || false);
        }
      } catch {
        setIsAdmin(false);
      }
    };
    if (user) {
      checkAdminStatus();
    }
  }, [user]);

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

      const response = await fetch('/api/chat/list', { headers, cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        setChats(data.chats || []);
      } else {
        console.error('Failed to load chats');
        toast({
          title: t.chat.loadFailed,
          description: t.chat.networkError,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading chats:', error);
      toast({
        title: t.chat.loadFailed,
        description: t.chat.networkError,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (authLoading || !mounted) return;

    if (!user || !user.id) {
      router.push('/auth/login');
      return;
    }

    loadChats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, mounted]);

  // Filter chats based on search query
  const filteredChats = chats.filter(chat =>
    chat.matched_user.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format time for last message
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString(language === 'zh' ? 'zh-CN' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else if (diffDays === 1) {
      return t.chat.yesterday;
    } else if (diffDays < 7) {
      return date.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
        weekday: 'short'
      });
    } else {
      return date.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return <div suppressHydrationWarning />;
  }

  if (loading || authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardSidebar user={user} isAdmin={isAdmin} />

      <main className="flex-1 w-full pt-14 md:pt-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          {/* Page Header */}
          <div className="mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                    <MessageSquare className="h-6 w-6 mr-2 text-blue-600" />
                    {t.chat.title}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    {chats.length > 0
                      ? `${chats.length} ${t.chat.conversations}`
                      : t.chat.noChats
                    }
                  </p>
                </div>
              </div>

              {/* Search Bar */}
              {chats.length > 0 && (
                <div className="mt-4 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t.chat.searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Chat List */}
          {chats.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
                <MessageSquare className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t.chat.noChats}</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">{t.chat.startConversation}</p>
              <button
                onClick={() => router.push('/matching')}
                className="inline-flex items-center bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Heart className="h-5 w-5 mr-2" />
                {t.chat.startMatching}
              </button>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
              <Search className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {t.chat.noConversationsFound}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t.chat.tryDifferentSearch}
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredChats.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => router.push(`/chat/${chat.id}`)}
                    className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1 min-w-0">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          {chat.matched_user.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={chat.matched_user.avatar_url}
                              alt={chat.matched_user.full_name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                              {chat.matched_user.full_name?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          {/* Online indicator (optional) */}
                          {/* <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div> */}
                        </div>

                        {/* Chat Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                              {chat.matched_user.full_name}
                            </h3>
                            {chat.last_message && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
                                {formatTime(chat.last_message.created_at)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            {chat.last_message ? (
                              <p className="text-sm text-gray-600 dark:text-gray-400 truncate pr-2">
                                {chat.last_message.sender_id === user.id && (
                                  <span className="text-gray-400 dark:text-gray-500">
                                    {t.chat.you}
                                  </span>
                                )}
                                {chat.last_message.content}
                              </p>
                            ) : (
                              <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                                {t.chat.startChatting}
                              </p>
                            )}
                            {chat.unread_count > 0 && (
                              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-blue-600 rounded-full flex-shrink-0">
                                {chat.unread_count > 99 ? '99+' : chat.unread_count}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Chevron */}
                      <ChevronRight className="h-5 w-5 text-gray-400 ml-2 flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Stats */}
          {chats.length > 0 && (
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t.chat.totalChats}
                    </p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{chats.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <MessageSquare className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t.chat.unread}
                    </p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {chats.reduce((sum, chat) => sum + chat.unread_count, 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
