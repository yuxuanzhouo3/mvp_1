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
import { Lock, CheckCircle, ArrowLeft, Sparkles } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const updatePasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type UpdatePasswordFormData = z.infer<typeof updatePasswordSchema>;

function UpdatePasswordContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { } = useAuth();
  const { toast } = useToast();

  const form = useForm<UpdatePasswordFormData>({
    resolver: zodResolver(updatePasswordSchema),
  });

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      // This would typically check if the user has a valid session
      // For now, we'll assume the user is authenticated if they reach this page
    };
    checkAuth();
  }, []);

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
        toast({
          title: 'Update failed',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        setPasswordUpdated(true);
        toast({
          title: 'Password updated',
          description: 'Your password has been successfully updated',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

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
                    <Lock className="h-5 w-5 text-gray-800 group-focus-within:text-purple-500 transition-colors" />
                  </div>
              <Input
                {...form.register('password')}
                type="password"
                placeholder="New password"
                    className="pl-10 bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-purple-500 focus:ring-purple-500/50 focus:bg-white transition-all duration-300 shadow-lg"
                autoComplete="new-password"
              />
                </div>
              {form.formState.errors.password && (
                  <p className="text-sm text-red-400">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>
              
            <div className="space-y-2">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-800 group-focus-within:text-purple-500 transition-colors" />
                  </div>
              <Input
                {...form.register('confirmPassword')}
                type="password"
                placeholder="Confirm new password"
                    className="pl-10 bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-purple-500 focus:ring-purple-500/50 focus:bg-white transition-all duration-300 shadow-lg"
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
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Updating...</span>
                  </div>
                ) : (
                  <span>Update password</span>
                )}
            </Button>
          </form>

            <div className="text-center pt-4">
              <p className="text-sm text-gray-300">
              Remember your password?{' '}
                <Link 
                  href="/auth/login" 
                  className="text-purple-300 hover:text-purple-200 transition-colors duration-200 underline-offset-4 hover:underline font-medium"
                >
                Sign in
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
        <div className="text-white text-lg">Loading...</div>
      </div>
    }>
      <UpdatePasswordContent />
    </Suspense>
  );
} 