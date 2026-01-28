'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';
import { isChinaDeployment } from '@/lib/config/deployment.config';
import { Mail, Lock, Eye, EyeOff, Sparkles, Shield } from 'lucide-react';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const hasRedirectedRef = useRef(false);

  const router = useRouter();
  const { signIn, signInWithGoogle, signInWithWeChat, user } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = useTranslations(language);

  // Load saved email if "remember me" was checked previously
  useEffect(() => {
    const savedEmail = localStorage.getItem('remembered_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  // Immediate redirect if user is already authenticated
  useEffect(() => {
    if (user && user.id && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      // CN 环境：使用 window.location.href 进行硬刷新，确保中间件能读取 cookie
      // INTL 环境：使用 router.push 进行客户端导航
      if (isChinaDeployment()) {
        window.location.href = '/dashboard';
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, router]);

  // Reset redirect ref if user logs out
  useEffect(() => {
    if (!user && hasRedirectedRef.current) {
      hasRedirectedRef.current = false;
    }
  }, [user]);

  // Reset loading state if user state changes
  useEffect(() => {
    if (user && isLoading) {
      setIsLoading(false);
    }
  }, [user, isLoading]);

  const onEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Basic validation
    if (!email || !password) {
      toast({
        title: t.common.error,
        description: t.auth.validation.fillAllFields,
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      toast({
        title: t.common.error,
        description: t.auth.validation.passwordTooShort,
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    if (!agreeToTerms) {
      toast({
        title: t.common.error,
        description: t.auth.login.mustAgreeToTerms,
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await signIn(email, password);

      if (error) {
        toast({
          title: t.auth.login.loginFailed,
          description: error.message,
          variant: 'destructive',
        });
        setIsLoading(false);
      } else {
        // Handle "remember me" functionality
        if (rememberMe) {
          localStorage.setItem('remembered_email', email);
        } else {
          localStorage.removeItem('remembered_email');
        }

        toast({
          title: t.common.success,
          description: t.auth.login.welcomeBack,
        });

        // 登录成功后，user 状态变化会自动触发 useEffect 中的重定向逻辑
        // CN 环境使用 window.location.href（确保中间件能读取 cookie）
        // INTL 环境使用 router.push（客户端导航）
        // 不需要在这里额外处理重定向
        
        setIsLoading(false);
      }
    } catch (error) {
      toast({
        title: t.common.error,
        description: t.auth.errors.unexpectedError,
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  const onGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast({
          title: t.auth.errors.googleSignInFailed,
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: t.common.success,
          description: t.auth.login.redirecting,
        });
      }
    } catch (error) {
      toast({
        title: t.common.error,
        description: t.auth.errors.unexpectedError,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 dark:from-gray-900 dark:to-gray-950 relative overflow-hidden">
      {/* Back to Home Button */}
      <Link
        href="/"
        className="absolute top-6 left-6 z-20 flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors duration-200"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span className="font-medium">{t.header.backToHome}</span>
      </Link>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl">
          <CardHeader className="text-center space-y-3 pb-8">
            <div className="flex items-center justify-center mb-2">
              <Link href="/" className="flex items-center space-x-3 hover:scale-105 transition-transform duration-200">
                <div className="p-3 bg-primary rounded-xl shadow-lg">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {isChinaDeployment() ? '晨佑个人链接' : 'PersonaLink'}
                </h1>
              </Link>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              {t.auth.login.title}
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300">
              {t.auth.login.subtitle}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 px-6 pb-6">
            <form onSubmit={onEmailSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                  </div>
                  <Input
                    type="email"
                    placeholder={t.auth.login.emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 focus:border-primary focus:ring-primary/50 transition-all duration-300 shadow-sm"
                    required
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                  </div>
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder={t.auth.login.passwordPlaceholder}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 focus:border-primary focus:ring-primary/50 transition-all duration-300 shadow-sm"
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-primary transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <label
                    htmlFor="remember-me"
                    className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer"
                  >
                    {t.auth.login.rememberMe}
                  </label>
                </div>
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-primary hover:text-primary/80 transition-colors duration-200 underline-offset-4 hover:underline"
                >
                  {t.auth.login.forgotPassword}
                </Link>
              </div>

              {/* Terms and Privacy Agreement */}
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="agree-terms"
                  checked={agreeToTerms}
                  onCheckedChange={(checked) => setAgreeToTerms(checked as boolean)}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary mt-0.5"
                />
                <label
                  htmlFor="agree-terms"
                  className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer leading-relaxed"
                >
                  {t.auth.login.agreeToTerms}{' '}
                  <Link
                    href="/terms"
                    className="text-primary hover:text-primary/80 underline-offset-4 hover:underline"
                    target="_blank"
                  >
                    {t.auth.login.termsOfService}
                  </Link>
                  {' '}{t.auth.login.and}{' '}
                  <Link
                    href="/privacy"
                    className="text-primary hover:text-primary/80 underline-offset-4 hover:underline"
                    target="_blank"
                  >
                    {t.auth.login.privacyPolicy}
                  </Link>
                </label>
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{t.auth.login.signingIn}</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4" />
                    <span>{t.auth.login.signInButton}</span>
                  </div>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white dark:bg-gray-900 px-2 text-gray-500">{t.common.or}</span>
              </div>
            </div>

            {/* Social Login Button - WeChat for CN, Google for INTL */}
            {isChinaDeployment() ? (
              <Button
                type="button"
                onClick={async () => {
                  setIsLoading(true);
                  const { error } = await signInWithWeChat();
                  if (error) {
                    toast({
                      title: t.common.error,
                      description: error.message,
                      variant: 'destructive',
                    });
                    setIsLoading(false);
                  }
                }}
                variant="outline"
                className="w-full bg-[#07C160] hover:bg-[#06AD56] text-white border-[#07C160] font-medium py-3 rounded-lg shadow-sm transition-all duration-300"
                disabled={isLoading}
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.269-.03-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z"/>
                </svg>
                {t.auth.login.continueWithWeChat || '微信登录'}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={onGoogleSignIn}
                variant="outline"
                className="w-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium py-3 rounded-lg shadow-sm transition-all duration-300"
                disabled={isLoading}
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {t.auth.login.continueWithGoogle}
              </Button>
            )}

            <div className="text-center pt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t.auth.login.noAccount}{' '}
                <Link
                  href="/auth/register"
                  className="text-primary hover:text-primary/80 transition-colors duration-200 underline-offset-4 hover:underline font-medium"
                >
                  {t.auth.login.signUp}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
