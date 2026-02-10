'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Mail, ArrowLeft, CheckCircle, Sparkles } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';
import { isChinaDeployment } from '@/lib/config/deployment.config';
import { getBrandName } from '@/lib/config/branding.config';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const { toast } = useToast();
  const { language } = useLanguage();
  const t = useTranslations(language);
  const isCN = isChinaDeployment();

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const sendResetCode = async () => {
    const email = form.getValues('email');
    if (!email) {
      toast({
        title: t.common.error,
        description: t.auth.validation.emailRequired,
        variant: 'destructive',
      });
      return;
    }

    setIsSendingCode(true);
    try {
      const res = await fetch('/api/auth/cn-email-code/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose: 'reset_password' }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(result?.error || '发送验证码失败');
      }

      setCountdown(60);
      toast({
        title: t.common.success,
        description: '验证码已发送，请检查邮箱',
      });
    } catch (error: any) {
      toast({
        title: t.common.error,
        description: error?.message || '发送验证码失败',
        variant: 'destructive',
      });
    } finally {
      setIsSendingCode(false);
    }
  };

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    try {
      if (isCN) {
        if (!verificationCode.trim()) {
          throw new Error('请输入邮箱验证码');
        }
        window.location.href = `/auth/update-password?email=${encodeURIComponent(data.email)}&code=${encodeURIComponent(verificationCode)}`;
        return;
      }

      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth/update-password`
      });

      if (error) {
        toast({
          title: t.auth.errors.resetFailed,
          description: error.message || t.auth.errors.resetFailedDesc,
          variant: 'destructive',
        });
      } else {
        setEmailSent(true);
        toast({
          title: t.auth.success.resetEmailSent,
          description: t.auth.success.resetEmailSentDesc,
        });
      }
    } catch (error: any) {
      toast({
        title: t.auth.errors.generalError,
        description: error?.message || t.auth.errors.generalErrorDesc,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent && !isCN) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 dark:from-gray-900 dark:to-gray-950 relative overflow-hidden">
        <Link href="/" className="absolute top-6 left-6 z-20 flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors duration-200">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="font-medium">{t.header.backToHome}</span>
        </Link>

        <div className="relative z-10 w-full max-w-md mx-4">
          <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl">
            <CardHeader className="text-center space-y-4 pb-6">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500 shadow-lg">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {t.forgotPassword.checkEmail}
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-300 text-lg">
                {t.forgotPassword.checkEmailDesc}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {t.auth.forgotPassword.dontReceiveEmail}{' '}
                <button onClick={() => setEmailSent(false)} className="text-primary hover:text-primary/80 transition-colors duration-200 underline-offset-4 hover:underline">
                  {t.forgotPassword.tryAgain}
                </button>
              </p>
              <Link href="/auth/login">
                <Button variant="outline" className="w-full border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-300">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t.forgotPassword.backToLogin}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 dark:from-gray-900 dark:to-gray-950 relative overflow-hidden">
      <Link href="/" className="absolute top-6 left-6 z-20 flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors duration-200">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span className="font-medium">{t.header.backToHome}</span>
      </Link>

      <div className="relative z-10 w-full max-w-md mx-4">
        <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl">
          <CardHeader className="text-center space-y-4 pb-6">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <Link href="/" className="flex items-center space-x-3 hover:scale-105 transition-transform duration-200">
                <div className="p-3 bg-primary rounded-xl shadow-lg">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {getBrandName({ isCN: isChinaDeployment() })}
                </h1>
              </Link>
            </div>
            <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {t.forgotPassword.title}
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300 text-lg">
              {t.forgotPassword.subtitle}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                  </div>
                  <Input
                    {...form.register('email')}
                    type="email"
                    placeholder={t.forgotPassword.emailPlaceholder}
                    className="pl-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 focus:border-primary focus:ring-primary/50 transition-all duration-300 shadow-sm"
                    autoComplete="email"
                  />
                </div>
                {form.formState.errors.email && (
                  <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
                )}
              </div>

              {isCN && (
                <div className="space-y-2">
                  <div className="relative group">
                    <Input
                      type="text"
                      placeholder="请输入邮箱验证码"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      className="pr-32 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 focus:border-primary focus:ring-primary/50 transition-all duration-300 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={sendResetCode}
                      disabled={isSendingCode || countdown > 0 || isLoading}
                      className="absolute inset-y-0 right-0 px-3 text-xs text-primary hover:text-primary/80 disabled:text-gray-400"
                    >
                      {countdown > 0 ? `${countdown}s` : (isSendingCode ? '发送中...' : '发送验证码')}
                    </button>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none" disabled={isLoading}>
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{t.forgotPassword.sendingResetEmail}</span>
                  </div>
                ) : (
                  <span>{isCN ? '下一步' : t.forgotPassword.sendResetEmail}</span>
                )}
              </Button>
            </form>

            <div className="text-center pt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t.forgotPassword.rememberPassword}{' '}
                <Link href="/auth/login" className="text-primary hover:text-primary/80 transition-colors duration-200 underline-offset-4 hover:underline font-medium">
                  {t.forgotPassword.backToLogin}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

