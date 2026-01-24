'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers/AuthProvider';
import { useLanguage } from '@/components/language-provider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CheckCircle2 } from 'lucide-react';

export default function MatchingHistoryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'likes' | 'picks'>('likes');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!user) {
      router.push('/auth/login');
      return;
    }
  }, [user, mounted, router]);

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
        {/* Upgrade Prompt */}
        <div className="text-center mb-6">
          <p className="text-gray-700 dark:text-gray-300">
            {language === 'zh'
              ? '升级至 Gold 来查看给你点赞的人。'
              : 'Upgrade to Gold to see who likes you.'}
          </p>
        </div>

        {/* Blurred User Card */}
        <div className="max-w-sm mx-auto mb-6">
          <Card className="overflow-hidden">
            <div className="relative">
              {/* Blurred background */}
              <div className="h-96 bg-gradient-to-b from-orange-200 via-orange-300 to-gray-800 relative">
                <div className="absolute inset-0 backdrop-blur-3xl bg-white/30 dark:bg-gray-900/30" />

                {/* User info at bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                  <div className="flex items-center space-x-2 text-white">
                    <span className="text-2xl font-bold">25</span>
                    <CheckCircle2 className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="flex items-center space-x-1 text-white text-sm mt-1">
                    <span>🎓</span>
                    <span>{language === 'zh' ? '读研/读博中' : 'Graduate Student'}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* CTA Button */}
        <div className="max-w-sm mx-auto">
          <Button
            className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-gray-900 font-semibold py-6 rounded-full text-lg shadow-lg"
            onClick={() => router.push('/payment/membership')}
          >
            {language === 'zh' ? '查看给你点赞的人' : 'See Who Likes You'}
          </Button>
        </div>
      </div>
    </div>
  );
}
