'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { Mail, ArrowLeft, CheckCircle, Sparkles, Shield, Zap } from 'lucide-react';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const router = useRouter();
  const { resetPassword } = useAuth();
  const { toast } = useToast();

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    try {
      const { error } = await resetPassword(data.email);
      if (error) {
        toast({
          title: 'Reset failed',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        setEmailSent(true);
        toast({
          title: 'Reset email sent',
          description: 'Check your email for password reset instructions',
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

  if (emailSent) {
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
              <CardTitle className="text-3xl font-bold text-white mb-2">Check your email</CardTitle>
              <CardDescription className="text-gray-300 text-lg">
                We've sent you a password reset link to complete the process
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <p className="text-sm text-gray-300 mb-4">
                Didn't receive the email? Check your spam folder or{' '}
                <button
                  onClick={() => setEmailSent(false)}
                  className="text-purple-300 hover:text-purple-200 transition-colors duration-200 underline-offset-4 hover:underline"
                >
                  try again
                </button>
              </p>
              <Link href="/auth/login">
                <Button 
                  variant="outline" 
                  className="w-full border-white/20 text-white hover:bg-white/10 transition-all duration-300"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to login
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
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                PersonaLink
              </h1>
            </div>
            <CardTitle className="text-3xl font-bold text-white mb-2">
              Reset password
            </CardTitle>
            <CardDescription className="text-gray-300 text-lg">
              Enter your email address and we'll send you a link to reset your password
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-purple-400 transition-colors" />
                  </div>
                  <Input
                    {...form.register('email')}
                    type="email"
                    placeholder="Enter your email address"
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-purple-400 focus:ring-purple-400/20 transition-all duration-300 backdrop-blur-sm"
                    autoComplete="email"
                  />
                </div>
                {form.formState.errors.email && (
                  <p className="text-sm text-red-400">
                    {form.formState.errors.email.message}
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
                    <span>Sending...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4" />
                    <span>Send reset link</span>
                  </div>
                )}
              </Button>
            </form>

            {/* Mock mode hint */}
            <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center space-x-2 mb-1">
                <Zap className="h-4 w-4 text-yellow-400" />
                <span className="text-xs font-medium text-yellow-300">Mock Mode</span>
              </div>
              <p className="text-xs text-gray-300">
                Password reset will work with any valid email format
              </p>
            </div>

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