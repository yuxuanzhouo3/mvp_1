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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { Mail, ArrowLeft, CheckCircle, Sparkles, Shield, Phone } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [phoneSent, setPhoneSent] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [activeTab, setActiveTab] = useState('email');
  const router = useRouter();
  const { signInWithPhone, verifyPhoneOTP } = useAuth();
  const { toast } = useToast();

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      
      // Send password reset email - Supabase will handle user existence check

      // Send password reset email
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth/update-password`
      });
      
      if (error) {
        console.error('Password reset error:', error);
        toast({
          title: 'Reset failed',
          description: error.message || 'Failed to send reset email. Please try again.',
          variant: 'destructive',
        });
      } else {
        setEmailSent(true);
        toast({
          title: 'Reset email sent',
          description: 'Check your email for password reset instructions. If you don\'t see it, check your spam folder.',
        });
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

  const onPhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    if (!phone || phone.length < 10) {
      toast({
        title: 'Error',
        description: 'Please enter a valid phone number',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await signInWithPhone(phone);
      if (error) {
        toast({
          title: 'Phone reset not available',
          description: error.message,
          variant: 'destructive',
        });
        setIsLoading(false);
      } else {
        setPhoneSent(true);
        setPhoneNumber(phone);
        toast({
          title: 'OTP sent',
          description: 'Check your phone for the verification code',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Phone reset is not available in this mode',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  const onOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    if (!otp || otp.length !== 6) {
      toast({
        title: 'Error',
        description: 'Please enter a valid 6-digit code',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await verifyPhoneOTP(phoneNumber, otp);
      if (error) {
        toast({
          title: 'Invalid code',
          description: 'Please check your code and try again',
          variant: 'destructive',
        });
        setIsLoading(false);
      } else {
        toast({
          title: 'Success',
          description: 'Phone verification successful! Redirecting to password reset...',
        });
        // Redirect to password reset page
        setTimeout(() => {
          router.push('/auth/update-password');
        }, 2000);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
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
              <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                <p className="text-sm text-gray-300 mb-2">
                  <strong>Important:</strong>
                </p>
                <ul className="text-xs text-gray-300 space-y-1 text-left">
                  <li>• Check your spam/junk folder</li>
                  <li>• The link expires in 1 hour</li>
                  <li>• Click the link in the email to reset your password</li>
                </ul>
              </div>
              <p className="text-sm text-gray-300 mb-4">
                Didn't receive the email?{' '}
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
              Reset password
            </CardTitle>
            <CardDescription className="text-white text-lg font-medium drop-shadow-sm">
              Choose how you'd like to reset your password
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-white/10 backdrop-blur-sm border border-white/20">
                <TabsTrigger 
                  value="email" 
                  className="text-white bg-white/20 hover:bg-white/30 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 border border-white/30"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </TabsTrigger>
                <TabsTrigger 
                  value="phone"
                  className="text-white bg-white/20 hover:bg-white/30 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 border border-white/30"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Phone
                </TabsTrigger>
              </TabsList>

              <TabsContent value="email" className="space-y-6 mt-6">
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-800 group-focus-within:text-purple-500 transition-colors" />
                      </div>
                      <Input
                        {...form.register('email')}
                        type="email"
                        placeholder="Enter your email address"
                        className="pl-10 bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-purple-500 focus:ring-purple-500/50 focus:bg-white transition-all duration-300 shadow-lg"
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
                      <span>Send reset email</span>
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="phone" className="space-y-6 mt-6">
                {!phoneSent ? (
                  <form onSubmit={onPhoneSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Phone className="h-5 w-5 text-gray-800 group-focus-within:text-purple-500 transition-colors" />
                        </div>
                        <Input
                          type="tel"
                          placeholder="Enter your phone number"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="pl-10 bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-purple-500 focus:ring-purple-500/50 focus:bg-white transition-all duration-300 shadow-lg"
                          autoComplete="tel"
                        />
                      </div>
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
                        <span>Send verification code</span>
                      )}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={onOTPSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-sm text-gray-300 text-center">
                        Enter the 6-digit code sent to {phoneNumber}
                      </p>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Shield className="h-5 w-5 text-gray-800 group-focus-within:text-purple-500 transition-colors" />
                        </div>
                        <Input
                          type="text"
                          placeholder="Enter 6-digit code"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          className="pl-10 bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-purple-500 focus:ring-purple-500/50 focus:bg-white transition-all duration-300 shadow-lg text-center text-lg tracking-widest"
                          maxLength={6}
                        />
                      </div>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      disabled={isLoading || otp.length !== 6}
                    >
                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Verifying...</span>
                        </div>
                      ) : (
                        <span>Verify code</span>
                      )}
                    </Button>
                    
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => setPhoneSent(false)}
                        className="text-sm text-purple-300 hover:text-purple-200 transition-colors duration-200 underline-offset-4 hover:underline"
                      >
                        Use different phone number
                      </button>
                    </div>
                  </form>
                )}
              </TabsContent>
            </Tabs>

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