'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';
import { Mail, Lock, User, CheckCircle, Sparkles, Shield, Check, X } from 'lucide-react';

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const { signUp, signInWithGoogle } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = useTranslations(language);

  type RegisterFormData = {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
  };

  // ✅ 修复：直接使用 t，不要在 useMemo 内部调用 useTranslations
  const registerSchema = useMemo(() => {
    return z.object({
      fullName: z.string()
        .min(1, t.auth.validation.fullNameRequired)
        .min(2, t.auth.validation.fullNameTooShort),
      email: z.string()
        .min(1, t.auth.validation.emailRequired)
        .email(t.auth.validation.emailInvalid),
      password: z.string()
        .min(1, t.auth.validation.passwordRequired)
        .min(8, t.auth.validation.passwordMinLength),
      confirmPassword: z.string()
        .min(1, t.auth.validation.passwordRequired),
    }).refine((data) => data.password === data.confirmPassword, {
      message: t.auth.validation.passwordsNotMatch,
      path: ["confirmPassword"],
    });
  }, [language]); // ✅ 只依赖 language

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  // Password validation helper
  const password = form.watch('password') || '';
  const passwordChecks = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      const { error } = await signUp(data.email, data.password);
      if (error) {
        toast({
          title: t.common.error,
          description: t.auth.register.registrationFailed,
          variant: 'destructive',
        });
      } else {
        setEmailSent(true);
        toast({
          title: t.common.success,
          description: t.auth.register.checkEmail,
        });
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: t.common.error,
        description: t.auth.errors.unexpectedError,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
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
        description: t.auth.errors.googleSignInUnexpected,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 dark:from-gray-900 dark:to-gray-950 relative overflow-hidden">
        <Link
          href="/"
          className="absolute top-6 left-6 z-20 flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors duration-200"
        >
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
              <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t.auth.register.checkYourEmail}</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-300 text-lg">
                {t.auth.register.verificationSent}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {t.auth.register.didntReceive}{' '}
                <button
                  onClick={() => setEmailSent(false)}
                  className="text-primary hover:text-primary/80 transition-colors duration-200 underline-offset-4 hover:underline"
                >
                  {t.auth.register.tryAgain}
                </button>
              </p>
              <Link href="/auth/login">
                <Button
                  variant="outline"
                  className="w-full border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300"
                >
                  {t.auth.register.backToLogin}
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
      <Link
        href="/"
        className="absolute top-6 left-6 z-20 flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors duration-200"
      >
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
                  PersonaLink
                </h1>
              </Link>
            </div>
            <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {t.auth.register.title}
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300 text-lg">
              {t.auth.register.subtitle}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                  </div>
                  <Input
                    {...form.register('fullName')}
                    type="text"
                    placeholder={t.auth.register.fullNamePlaceholder}
                    className="pl-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 focus:border-primary focus:ring-primary/50 transition-all duration-300 shadow-sm"
                    autoComplete="name"
                  />
                </div>
                {form.formState.errors.fullName && (
                  <p className="text-sm text-red-400">
                    {form.formState.errors.fullName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                  </div>
                  <Input
                    {...form.register('email')}
                    type="email"
                    placeholder={t.auth.register.emailPlaceholder}
                    className="pl-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 focus:border-primary focus:ring-primary/50 transition-all duration-300 shadow-sm"
                    autoComplete="email"
                  />
                </div>
                {form.formState.errors.email && (
                  <p className="text-sm text-red-400">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                  </div>
                  <Input
                    {...form.register('password')}
                    type="password"
                    placeholder={t.auth.register.passwordPlaceholder}
                    className="pl-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 focus:border-primary focus:ring-primary/50 transition-all duration-300 shadow-sm"
                    autoComplete="new-password"
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                  />
                </div>
                {/* Password validation hints */}
                {(passwordFocused || password.length > 0) && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                      {t.auth.validation.passwordRequirements}
                    </p>
                    <div className="space-y-1">
                      <div className={`flex items-center gap-2 text-xs ${passwordChecks.minLength ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        {passwordChecks.minLength ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        <span>{t.auth.validation.passwordMinChars}</span>
                      </div>
                      <div className={`flex items-center gap-2 text-xs ${passwordChecks.hasUppercase ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        {passwordChecks.hasUppercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        <span>{t.auth.validation.passwordUppercase}</span>
                      </div>
                      <div className={`flex items-center gap-2 text-xs ${passwordChecks.hasLowercase ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        {passwordChecks.hasLowercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        <span>{t.auth.validation.passwordLowercase}</span>
                      </div>
                      <div className={`flex items-center gap-2 text-xs ${passwordChecks.hasNumber ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        {passwordChecks.hasNumber ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        <span>{t.auth.validation.passwordNumber}</span>
                      </div>
                      <div className={`flex items-center gap-2 text-xs ${passwordChecks.hasSpecial ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        {passwordChecks.hasSpecial ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        <span>{t.auth.validation.passwordSpecial}</span>
                      </div>
                    </div>
                  </div>
                )}
                {form.formState.errors.password && (
                  <p className="text-sm text-red-400">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                  </div>
                  <Input
                    {...form.register('confirmPassword')}
                    type="password"
                    placeholder={t.auth.register.confirmPasswordPlaceholder}
                    className="pl-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 focus:border-primary focus:ring-primary/50 transition-all duration-300 shadow-sm"
                    autoComplete="new-password"
                  />
                </div>
                {form.formState.errors.confirmPassword && (
                  <p className="text-sm text-red-400">
                    {form.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{t.auth.register.creating}</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4" />
                    <span>{t.auth.register.createButton}</span>
                  </div>
                )}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white dark:bg-gray-900 px-2 text-gray-500">{t.common.or}</span>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleGoogleSignIn}
              variant="outline"
              className="w-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium py-3 rounded-lg shadow-sm transition-all duration-300"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>{t.common.loading}...</span>
                </div>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {t.auth.register.continueWithGoogle}
                </>
              )}
            </Button>

            <div className="text-center pt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t.auth.register.haveAccount}{' '}
                <Link
                  href="/auth/login"
                  className="text-primary hover:text-primary/80 transition-colors duration-200 underline-offset-4 hover:underline font-medium"
                >
                  {t.auth.register.signIn}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}