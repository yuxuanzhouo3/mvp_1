'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { Lock, CheckCircle, ArrowLeft, Sparkles, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const updatePasswordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type UpdatePasswordFormData = z.infer<typeof updatePasswordSchema>;

// Helper function to parse URL hash parameters
function parseHashParams() {
  if (typeof window === 'undefined') return {};
  
  const hash = window.location.hash.substring(1); // Remove the #
  const params = new URLSearchParams(hash);
  const result: Record<string, string> = {};
  
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  
  return result;
}

function UpdatePasswordContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<UpdatePasswordFormData>({
    resolver: zodResolver(updatePasswordSchema),
  });

  useEffect(() => {
    const checkSession = async () => {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session check error:', error);
          toast({
            title: 'Session Error',
            description: 'Please try the password reset process again.',
            variant: 'destructive',
          });
          router.push('/auth/forgot-password');
          return;
        }

        if (!session) {
          // Check both URL search params and hash params
          const accessToken = searchParams.get('access_token') || parseHashParams().access_token;
          const refreshToken = searchParams.get('refresh_token') || parseHashParams().refresh_token;
          
          console.log('Checking for tokens:', { accessToken: !!accessToken, refreshToken: !!refreshToken });
          
          if (accessToken && refreshToken) {
            // Set the session from URL params
            const { error: setSessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            
            if (setSessionError) {
              console.error('Set session error:', setSessionError);
              toast({
                title: 'Invalid Reset Link',
                description: 'This password reset link is invalid or has expired. Please request a new one.',
                variant: 'destructive',
              });
              router.push('/auth/forgot-password');
              return;
            }
            
            // Clear the hash from URL after processing
            if (window.location.hash) {
              window.history.replaceState(null, '', window.location.pathname);
            }
          } else {
            toast({
              title: 'No Valid Session',
              description: 'Please use the password reset link from your email.',
              variant: 'destructive',
            });
            router.push('/auth/forgot-password');
            return;
          }
        }
        
        setIsValidSession(true);
      } catch (error) {
        console.error('Session check failed:', error);
        toast({
          title: 'Error',
          description: 'Unable to verify your session. Please try again.',
          variant: 'destructive',
        });
        router.push('/auth/forgot-password');
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkSession();
  }, [router, searchParams, toast]);

  const onSubmit = async (data: UpdatePasswordFormData) => {
    setIsLoading(true);
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      
      const { error } = await supabase.auth.updateUser({
        password: data.password
      });
      
      if (error) {
        console.error('Password update error:', error);
        toast({
          title: 'Update failed',
          description: error.message || 'Failed to update password. Please try again.',
          variant: 'destructive',
        });
      } else {
        setPasswordUpdated(true);
        toast({
          title: 'Password updated',
          description: 'Your password has been successfully updated. You can now sign in with your new password.',
        });
        
        // Sign out the user after password update
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
        <div className="relative z-10 w-full max-w-md mx-4">
          <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl">
            <CardContent className="text-center py-12">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-white text-lg">Verifying your session...</span>
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative z-10 w-full max-w-md mx-4">
          <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl">
            <CardHeader className="text-center space-y-4 pb-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-green-500 to-emerald-500 shadow-glow">
                <CheckCircle className="h-8 w-8 text-white" />
            </div>
              <CardTitle className="text-3xl font-bold text-white mb-2">Password Updated</CardTitle>
              <CardDescription className="text-gray-300 text-lg">
              Your password has been successfully updated. You can now sign in with your new password.
            </CardDescription>
          </CardHeader>
            <CardContent className="text-center space-y-6">
            <Link href="/auth/login">
                <Button 
                  variant="outline" 
                  className="w-full border-white/20 text-white hover:bg-white/10 transition-all duration-300"
                >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Sign in
              </Button>
            </Link>
          </CardContent>
        </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl">
          <CardHeader className="text-center space-y-4 pb-8">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <Link href="/" className="flex items-center space-x-3 hover:scale-105 transition-transform duration-200">
                <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-lg">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white drop-shadow-lg">
                  PersonaLink
                </h1>
              </Link>
            </div>
            <CardTitle className="text-3xl font-bold text-white mb-2">
              Update Password
            </CardTitle>
            <CardDescription className="text-white text-lg font-medium drop-shadow-sm">
            Enter your new password below
          </CardDescription>
        </CardHeader>
          
          <CardContent className="space-y-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                  </div>
                  <Input
                    {...form.register('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="New password"
                    className="pl-10 pr-10 bg-white/5 border-white/20 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-white transition-colors" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-white transition-colors" />
                    )}
                  </button>
                </div>
                {form.formState.errors.password && (
                  <p className="text-red-400 text-sm">{form.formState.errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                  </div>
                  <Input
                    {...form.register('confirmPassword')}
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    className="pl-10 pr-10 bg-white/5 border-white/20 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-white transition-colors" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-white transition-colors" />
                    )}
                  </button>
                </div>
                {form.formState.errors.confirmPassword && (
                  <p className="text-red-400 text-sm">{form.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Updating...</span>
                  </div>
                ) : (
                  'Update password'
                )}
              </Button>
            </form>

            <div className="text-center">
              <Link href="/auth/login" className="text-purple-300 hover:text-white transition-colors text-sm">
                Remember your password? Sign in
              </Link>
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <UpdatePasswordContent />
    </Suspense>
  );
} 