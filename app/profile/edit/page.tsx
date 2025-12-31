'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { User, MapPin, Calendar, Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const profileEditSchema = z.object({
  username: z.string().min(3, '用户名至少3个字符'),
  bio: z.string().max(500, '个人简介不能超过500字符'),
  age: z.number().min(18, '年龄必须至少18岁').max(100, '年龄不能超过100岁'),
  location: z.string().min(2, '请输入有效的位置'),
});

type ProfileEditFormData = z.infer<typeof profileEditSchema>;

export default function ProfileEditPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<ProfileEditFormData>({
    resolver: zodResolver(profileEditSchema),
  });

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    loadProfile();
  }, [user, router]);

  const loadProfile = async () => {
    try {
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
        form.reset({
          username: data.profile.username || '',
          bio: data.profile.bio || '',
          age: data.profile.age || 18,
          location: data.profile.location || '',
        });
      }
    } catch (error) {
      toast({
        title: '加载失败',
        description: '无法加载个人资料',
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (data: ProfileEditFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast({
          title: '更新成功',
          description: '您的个人资料已成功更新',
        });
        router.push('/dashboard');
      } else {
        throw new Error('更新失败');
      }
    } catch (error) {
      toast({
        title: '更新失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">加载个人资料中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              编辑个人资料
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              更新您的个人信息和偏好设置
            </p>
          </div>
          <Link href="/dashboard">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回仪表盘
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
            <CardDescription>
              更新您的基本个人信息
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label className="text-sm font-medium">用户名</label>
                <Input
                  {...form.register('username')}
                  placeholder="输入用户名"
                  icon={<User className="h-4 w-4" />}
                />
                {form.formState.errors.username && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.username.message}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium">个人简介</label>
                <Textarea
                  {...form.register('bio')}
                  placeholder="简单介绍一下自己..."
                  rows={4}
                />
                {form.formState.errors.bio && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.bio.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">年龄</label>
                  <Input
                    {...form.register('age', { valueAsNumber: true })}
                    type="number"
                    placeholder="年龄"
                    icon={<Calendar className="h-4 w-4" />}
                  />
                  {form.formState.errors.age && (
                    <p className="text-sm text-red-500 mt-1">
                      {form.formState.errors.age.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium">位置</label>
                  <Input
                    {...form.register('location')}
                    placeholder="城市，国家"
                    icon={<MapPin className="h-4 w-4" />}
                  />
                  {form.formState.errors.location && (
                    <p className="text-sm text-red-500 mt-1">
                      {form.formState.errors.location.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <Link href="/dashboard">
                  <Button type="button" variant="outline">
                    取消
                  </Button>
                </Link>
                <Button type="submit" disabled={isLoading}>
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? '保存中...' : '保存更改'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 