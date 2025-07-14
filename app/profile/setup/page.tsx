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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { User, MapPin, Calendar, Heart, Save } from 'lucide-react';

const profileSetupSchema = z.object({
  username: z.string().min(3, '用户名至少3个字符'),
  bio: z.string().max(500, '个人简介不能超过500字符'),
  age: z.number().min(18, '年龄必须至少18岁').max(100, '年龄不能超过100岁'),
  gender: z.enum(['male', 'female', 'other']),
  location: z.string().min(2, '请输入有效的位置'),
  interests: z.array(z.string()).min(1, '请至少选择一个兴趣'),
  industry: z.string().min(2, '请输入您的行业'),
  communication_style: z.enum(['casual', 'formal', 'friendly', 'professional']),
});

type ProfileSetupFormData = z.infer<typeof profileSetupSchema>;

const interestOptions = [
  '技术', '音乐', '旅行', '阅读', '运动', '美食', '艺术', '电影',
  '游戏', '摄影', '写作', '编程', '设计', '商业', '科学', '历史'
];

const industryOptions = [
  '技术', '金融', '医疗', '教育', '媒体', '零售', '制造业', '服务业',
  '政府', '非营利组织', '自由职业', '学生', '其他'
];

export default function ProfileSetupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<ProfileSetupFormData>({
    resolver: zodResolver(profileSetupSchema),
    defaultValues: {
      interests: [],
      communication_style: 'friendly',
    },
  });

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
  }, [user, router]);

  const onSubmit = async (data: ProfileSetupFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast({
          title: '设置成功',
          description: '您的个人资料已成功设置',
        });
        router.push('/dashboard');
      } else {
        throw new Error('设置失败');
      }
    } catch (error) {
      toast({
        title: '设置失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => {
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            设置个人资料
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            完善您的个人资料以获得更好的匹配体验
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {step}
                </div>
                {step < 3 && (
                  <div className={`w-12 h-1 mx-2 ${
                    step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {currentStep === 1 && '基本信息'}
              {currentStep === 2 && '兴趣爱好'}
              {currentStep === 3 && '沟通偏好'}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 && '填写您的基本个人信息'}
              {currentStep === 2 && '选择您感兴趣的话题和活动'}
              {currentStep === 3 && '设置您的沟通风格偏好'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {currentStep === 1 && (
                <div className="space-y-4">
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
                      rows={3}
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
                      <label className="text-sm font-medium">性别</label>
                      <Select onValueChange={(value) => form.setValue('gender', value as any)}>
                        <SelectTrigger>
                          <SelectValue placeholder="选择性别" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">男</SelectItem>
                          <SelectItem value="female">女</SelectItem>
                          <SelectItem value="other">其他</SelectItem>
                        </SelectContent>
                      </Select>
                      {form.formState.errors.gender && (
                        <p className="text-sm text-red-500 mt-1">
                          {form.formState.errors.gender.message}
                        </p>
                      )}
                    </div>
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
              )}

              {currentStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">兴趣爱好</label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {interestOptions.map((interest) => (
                        <Button
                          key={interest}
                          type="button"
                          variant={form.watch('interests').includes(interest) ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            const current = form.watch('interests');
                            const updated = current.includes(interest)
                              ? current.filter(i => i !== interest)
                              : [...current, interest];
                            form.setValue('interests', updated);
                          }}
                        >
                          {interest}
                        </Button>
                      ))}
                    </div>
                    {form.formState.errors.interests && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.interests.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium">行业</label>
                    <Select onValueChange={(value) => form.setValue('industry', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择您的行业" />
                      </SelectTrigger>
                      <SelectContent>
                        {industryOptions.map((industry) => (
                          <SelectItem key={industry} value={industry}>
                            {industry}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.industry && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.industry.message}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">沟通风格</label>
                    <Select onValueChange={(value) => form.setValue('communication_style', value as any)}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择您的沟通风格" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="casual">轻松随意</SelectItem>
                        <SelectItem value="formal">正式专业</SelectItem>
                        <SelectItem value="friendly">友好亲切</SelectItem>
                        <SelectItem value="professional">商务专业</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.formState.errors.communication_style && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.communication_style.message}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                >
                  上一步
                </Button>

                {currentStep < 3 ? (
                  <Button type="button" onClick={nextStep}>
                    下一步
                  </Button>
                ) : (
                  <Button type="submit" disabled={isLoading}>
                    <Save className="h-4 w-4 mr-2" />
                    {isLoading ? '保存中...' : '完成设置'}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 