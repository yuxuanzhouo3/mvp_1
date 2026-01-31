'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers/AuthProvider';
import { useLanguage } from '@/components/language-provider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { MobileBottomNav } from '@/components/dashboard/MobileBottomNav';
import { useToast } from '@/hooks/use-toast';
import { isChinaDeployment } from '@/lib/config/deployment.config';

type LikersPreview = {
  count: number;
  isPremiumOrHigher: boolean;
  canViewForFree: boolean;
  cost: number;
};

type LikerItem = {
  swipeId: string;
  action: 'like' | 'super_like';
  likedAt: string;
  isSuperLike: boolean;
  user: {
    id: string;
    username?: string;
    avatar_url?: string;
    gender?: string;
    age?: number;
    city_name?: string;
    total_score?: unknown;
  };
};

export default function MatchingHistoryPage() {
  const router = useRouter();
  const { user, session, loading: authLoading, signOut } = useAuth();
  const [mounted, setMounted] = useState(false);
  const { language } = useLanguage();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'likes' | 'picks'>('likes');

  const isCN = isChinaDeployment();

  const [preview, setPreview] = useState<LikersPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [likers, setLikers] = useState<LikerItem[]>([]);
  const [likersLoading, setLikersLoading] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (authLoading) return;
    if (!user) {
      router.push('/auth/login');
      return;
    }
    if (!isCN && !session?.access_token) {
      router.push('/auth/login');
      return;
    }
  }, [user, mounted, router, authLoading, isCN, session?.access_token]);

  useEffect(() => {
    if (!mounted || authLoading || !user) return;
    if (!isCN && !session?.access_token) return;
    void loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, authLoading, user?.id, isCN, session?.access_token]);

  useEffect(() => {
    if (!mounted || authLoading || !user) return;
    if (!isCN && !session?.access_token) return;
    if (preview?.isPremiumOrHigher && !unlocked && !likersLoading && likers.length === 0) {
      void unlockAndLoad();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview?.isPremiumOrHigher, mounted, authLoading, user?.id, isCN, session?.access_token]);

  const requestHeaders = () => {
    const headers: Record<string, string> = {};
    const accessToken = session?.access_token;
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    return headers;
  };

  const loadPreview = async () => {
    if (authLoading) return;
    if (!isCN && !session?.access_token) return;
    try {
      setPreviewLoading(true);
      const response = await fetch('/api/profile/view-likers', {
        method: 'GET',
        headers: requestHeaders(),
        credentials: 'include',
        cache: 'no-store',
      });

      if (response.status === 401) {
        await signOut();
        router.push('/auth/login');
        return;
      }

      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'FETCH_PREVIEW_FAILED');
      }

      setPreview(data.data as LikersPreview);
    } catch {
      toast({
        title: language === 'zh' ? '加载失败' : 'Load failed',
        description: language === 'zh' ? '无法获取点赞预览信息' : 'Failed to fetch likes preview',
        variant: 'destructive',
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const unlockAndLoad = async () => {
    if (likersLoading) return;
    if (authLoading) return;
    if (!isCN && !session?.access_token) return;
    try {
      setLikersLoading(true);
      const response = await fetch('/api/profile/view-likers?limit=50&offset=0', {
        method: 'POST',
        headers: requestHeaders(),
        credentials: 'include',
        cache: 'no-store',
      });

      if (response.status === 401) {
        await signOut();
        router.push('/auth/login');
        return;
      }

      const data = await response.json();

      if (response.status === 402) {
        toast({
          title: language === 'zh' ? '积分不足' : 'Insufficient credits',
          description: data?.upgradeTip || (language === 'zh' ? '请升级会员或充值积分' : 'Upgrade membership or recharge credits'),
          variant: 'destructive',
        });
        return;
      }

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'FETCH_LIKERS_FAILED');
      }

      setUnlocked(true);
      setLikers((data.data?.likers || []) as LikerItem[]);
    } catch {
      toast({
        title: language === 'zh' ? '加载失败' : 'Load failed',
        description: language === 'zh' ? '无法获取点赞列表' : 'Failed to fetch likes list',
        variant: 'destructive',
      });
    } finally {
      setLikersLoading(false);
    }
  };

  if (!mounted) {
    return <div suppressHydrationWarning />;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pb-20">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {language === 'zh' ? '赞' : 'Likes'}
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('likes')}
          className={`flex-1 py-3 text-center font-medium transition-colors relative ${
            activeTab === 'likes'
              ? 'text-pink-600 dark:text-pink-400'
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          {language === 'zh' ? '1次赞' : '1 Like'}
          {activeTab === 'likes' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-600 dark:bg-pink-400" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('picks')}
          className={`flex-1 py-3 text-center font-medium transition-colors relative ${
            activeTab === 'picks'
              ? 'text-pink-600 dark:text-pink-400'
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          {language === 'zh' ? '最佳精选' : 'Top Picks'}
          {activeTab === 'picks' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-600 dark:bg-pink-400" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="px-4 py-6">
        {activeTab === 'likes' ? (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-6">
              {previewLoading ? (
                <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-300">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{language === 'zh' ? '加载中…' : 'Loading…'}</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-gray-700 dark:text-gray-300">
                    {language === 'zh'
                      ? `${preview?.count ?? 0} 人喜欢了你`
                      : `${preview?.count ?? 0} people liked you`}
                  </p>
                  {!unlocked && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {preview?.isPremiumOrHigher
                        ? (language === 'zh' ? '你已解锁该权益，可直接查看。' : 'You can view this for free.')
                        : language === 'zh'
                          ? `查看需要 ${preview?.cost ?? 0} 积分，或升级会员免费查看。`
                          : `Viewing costs ${preview?.cost ?? 0} credits, or upgrade membership to view for free.`}
                    </p>
                  )}
                </div>
              )}
            </div>

            {unlocked ? (
              <>
                {likersLoading && likers.length === 0 ? (
                  <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-300 py-12">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>{language === 'zh' ? '加载中…' : 'Loading…'}</span>
                  </div>
                ) : likers.length === 0 ? (
                  <div className="text-center text-gray-600 dark:text-gray-400 py-12">
                    {language === 'zh' ? '暂无人点赞' : 'No likes yet'}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {likers.map((item) => (
                      <Card key={item.swipeId} className="overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={item.user.avatar_url} alt={item.user.username || 'User'} />
                              <AvatarFallback>{(item.user.username || 'U').slice(0, 1).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-900 dark:text-white truncate">
                                  {item.user.username || (language === 'zh' ? '未知用户' : 'Unknown')}
                                </p>
                                {item.isSuperLike && <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />}
                              </div>
                              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                {[item.user.age ? String(item.user.age) : null, item.user.city_name].filter(Boolean).join(' · ') || ' '}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="max-w-sm mx-auto space-y-3">
                <Button
                  className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-gray-900 font-semibold py-6 rounded-full text-lg shadow-lg"
                  onClick={unlockAndLoad}
                  disabled={likersLoading}
                >
                  {likersLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>{language === 'zh' ? '加载中…' : 'Loading…'}</span>
                    </span>
                  ) : (
                    <span>{language === 'zh' ? '查看给你点赞的人' : 'See Who Likes You'}</span>
                  )}
                </Button>

                {!preview?.isPremiumOrHigher && (
                  <Button variant="outline" className="w-full py-6 rounded-full text-lg" onClick={() => router.push('/payment/membership')}>
                    {language === 'zh' ? '升级会员' : 'Upgrade Membership'}
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="text-center text-gray-600 dark:text-gray-400 py-12">
              {language === 'zh' ? '敬请期待' : 'Coming soon'}
            </div>
          </div>
        )}
      </div>
      <MobileBottomNav />
    </div>
  );
}
