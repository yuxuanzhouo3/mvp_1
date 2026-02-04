'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Lock, CheckCircle, ArrowLeft, Sparkles, Eye, EyeOff } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';
import { isChinaDeployment } from '@/lib/config/deployment.config';

const updatePasswordSchema = z.object({
  password: z.string()
    .min(8, 'auth.errors.passwordTooShort')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'auth.errors.passwordRequirements'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "auth.errors.passwordsNotMatch",
  path: ["confirmPassword"],
});

type UpdatePasswordFormData = z.infer<typeof updatePasswordSchema>;

function UpdatePasswordContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = useTranslations(language);

  // Use ref to track session validity across closures
  const sessionFoundRef = useRef(false);

  const form = useForm<UpdatePasswordFormData>({
    resolver: zodResolver(updatePasswordSchema),
  });

  useEffect(() => {
    const supabase = getSupabaseClient();
    let timeoutId: NodeJS.Timeout;
    let redirectTimeoutId: NodeJS.Timeout;

    const markSessionValid = () => {
      sessionFoundRef.current = true;
      setIsValidSession(true);
      setIsCheckingSession(false);
    };

    // Listen for auth state changes - Supabase will automatically handle the recovery token
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      if (event === 'PASSWORD_RECOVERY') {
        // User clicked the recovery link and Supabase has validated it
        markSessionValid();
      } else if (event === 'SIGNED_IN' && session) {
        // User is signed in (could be from recovery or existing session)
        markSessionValid();
      } else if (event === 'INITIAL_SESSION') {
        // Check if there's already a valid session
        if (session) {
          markSessionValid();
        }
      }
    });

    // Check for recovery tokens in URL hash
    const initializeSession = async () => {
      const hash = window.location.hash;
      const hasRecoveryToken = hash && hash.includes('access_token') && hash.includes('type=recovery');

      if (hasRecoveryToken) {
        // Wait for Supabase to process the recovery token
        // The onAuthStateChange listener will handle the PASSWORD_RECOVERY event
        timeoutId = setTimeout(async () => {
          if (!sessionFoundRef.current) {
            // Fallback: check session directly
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              markSessionValid();
            } else {
              toast({
                title: t.auth.errors.noValidSession,
                description: t.auth.errors.noValidSessionDesc,
                variant: 'destructive',
              });
              router.push('/auth/forgot-password');
              setIsCheckingSession(false);
            }
          }
        }, 3000);
      } else {
        // No recovery hash, check for existing session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          markSessionValid();
        } else {
          // No session and no recovery token - redirect after brief delay
          redirectTimeoutId = setTimeout(() => {
            if (!sessionFoundRef.current) {
              toast({
                title: t.auth.errors.noValidSession,
                description: t.auth.errors.noValidSessionDesc,
                variant: 'destructive',
              });
              router.push('/auth/forgot-password');
              setIsCheckingSession(false);
            }
          }, 1500);
        }
      }
    };

    initializeSession();

    return () => {
      subscription.unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
      if (redirectTimeoutId) clearTimeout(redirectTimeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (data: UpdatePasswordFormData) => {
    setIsLoading(true);
    try {
      const supabase = getSupabaseClient();

      const { error } = await supabase.auth.updateUser({
        password: data.password
      });

      if (error) {
        console.error('Password update error:', error);
        toast({
          title: t.auth.errors.updateFailed,
          description: error.message || t.auth.errors.updateFailedDesc,
          variant: 'destructive',
        });
      } else {
        setPasswordUpdated(true);
        toast({
          title: t.updatePassword.passwordUpdateSuccess,
          description: t.auth.success.passwordUpdatedDesc,
        });

        // Sign out the user after password update
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: t.auth.errors.generalError,
        description: t.auth.errors.generalErrorDesc,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 dark:from-gray-900 dark:to-gray-950 relative overflow-hidden">
        <div className="relative z-10 w-full max-w-md mx-4">
          <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl">
            <CardContent className="text-center py-12">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-900 dark:text-white text-lg">{t.updatePassword.verifying}...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!isValidSession) {
    return null; // Will redirect to forgot password
  }

  if (passwordUpdated) {
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

        <div className="relative z-10 w-full max-w-md mx-4">
          <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl">
            <CardHeader className="text-center space-y-4 pb-6">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500 shadow-lg">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {t.updatePassword.passwordUpdateSuccess}
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-300 text-lg">
                {t.auth.success.passwordUpdatedDesc}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <Link href="/auth/login">
                <Button
                  variant="outline"
                  className="w-full border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-300"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t.auth.login.signIn}
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

      <div className="relative z-10 w-full max-w-md mx-4">
        <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl">
          <CardHeader className="text-center space-y-4 pb-6">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <Link href="/" className="flex items-center space-x-3 hover:scale-105 transition-transform duration-200">
                <div className="p-3 bg-primary rounded-xl shadow-lg">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {isChinaDeployment() ? '摩尔相亲' : 'PersonaLink'}
                </h1>
              </Link>
            </div>
            <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {t.updatePassword.title}
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300 text-lg">
              {t.updatePassword.subtitle}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                  </div>
                  <Input
                    {...form.register('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t.updatePassword.newPasswordPlaceholder}
                    className="pl-10 pr-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 focus:border-primary focus:ring-primary/50 transition-all duration-300 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-primary transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {form.formState.errors.password && (
                  <p className="text-red-500 text-sm">
                    {t.auth.errors[form.formState.errors.password.message as keyof typeof t.auth.errors] || form.formState.errors.password.message}
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
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder={t.updatePassword.confirmPasswordPlaceholder}
                    className="pl-10 pr-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 focus:border-primary focus:ring-primary/50 transition-all duration-300 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-primary transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {form.formState.errors.confirmPassword && (
                  <p className="text-red-500 text-sm">
                    {t.auth.errors[form.formState.errors.confirmPassword.message as keyof typeof t.auth.errors] || form.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{t.updatePassword.updating}</span>
                  </div>
                ) : (
                  t.updatePassword.updatePasswordButton
                )}
              </Button>
            </form>

            <div className="text-center pt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t.forgotPassword.rememberPassword}{' '}
                <Link
                  href="/auth/login"
                  className="text-primary hover:text-primary/80 transition-colors duration-200 underline-offset-4 hover:underline font-medium"
                >
                  {t.auth.login.signIn}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function UpdatePasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 dark:from-gray-900 dark:to-gray-950">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <UpdatePasswordContent />
    </Suspense>
  );
}

