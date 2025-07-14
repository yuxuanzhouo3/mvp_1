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
import { Mail, Lock, Phone, Chrome } from 'lucide-react';

const emailSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const phoneSchema = z.object({
  phone: z.string().min(10, 'Invalid phone number'),
});

const otpSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

type EmailFormData = z.infer<typeof emailSchema>;
type PhoneFormData = z.infer<typeof phoneSchema>;
type OTPFormData = z.infer<typeof otpSchema>;

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [phoneSent, setPhoneSent] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const router = useRouter();
  const { signIn, signInWithGoogle, signInWithPhone, verifyPhoneOTP } = useAuth();
  const { toast } = useToast();

  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
  });

  const phoneForm = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
  });

  const otpForm = useForm<OTPFormData>({
    resolver: zodResolver(otpSchema),
  });

  const onEmailSubmit = async (data: EmailFormData) => {
    setIsLoading(true);
    try {
      const { error } = await signIn(data.email, data.password);
      if (error) {
        toast({
          title: 'Login failed',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        router.push('/dashboard');
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

  const onGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast({
          title: 'Google sign-in failed',
          description: error.message,
          variant: 'destructive',
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

  const onPhoneSubmit = async (data: PhoneFormData) => {
    setIsLoading(true);
    try {
      const { error } = await signInWithPhone(data.phone);
      if (error) {
        toast({
          title: 'SMS failed',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        setPhoneSent(true);
        setPhoneNumber(data.phone);
        toast({
          title: 'SMS sent',
          description: 'Check your phone for the verification code',
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

  const onOTPSubmit = async (data: OTPFormData) => {
    setIsLoading(true);
    try {
      const { error } = await verifyPhoneOTP(phoneNumber, data.otp);
      if (error) {
        toast({
          title: 'Verification failed',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        router.push('/dashboard');
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription>
            Sign in to your PersonaLink account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="phone">Phone</TabsTrigger>
              <TabsTrigger value="google">Google</TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="space-y-4">
              <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    {...emailForm.register('email')}
                    type="email"
                    placeholder="Email"
                    icon={<Mail className="h-4 w-4" />}
                  />
                  {emailForm.formState.errors.email && (
                    <p className="text-sm text-red-500">
                      {emailForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Input
                    {...emailForm.register('password')}
                    type="password"
                    placeholder="Password"
                    icon={<Lock className="h-4 w-4" />}
                  />
                  {emailForm.formState.errors.password && (
                    <p className="text-sm text-red-500">
                      {emailForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </Button>
              </form>
              <div className="text-center">
                <Link href="/auth/forgot-password" className="text-sm text-blue-600 hover:underline">
                  Forgot password?
                </Link>
              </div>
            </TabsContent>

            <TabsContent value="phone" className="space-y-4">
              {!phoneSent ? (
                <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Input
                      {...phoneForm.register('phone')}
                      type="tel"
                      placeholder="Phone number"
                      icon={<Phone className="h-4 w-4" />}
                    />
                    {phoneForm.formState.errors.phone && (
                      <p className="text-sm text-red-500">
                        {phoneForm.formState.errors.phone.message}
                      </p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Sending SMS...' : 'Send verification code'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={otpForm.handleSubmit(onOTPSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Input
                      {...otpForm.register('otp')}
                      type="text"
                      placeholder="Enter 6-digit code"
                      maxLength={6}
                    />
                    {otpForm.formState.errors.otp && (
                      <p className="text-sm text-red-500">
                        {otpForm.formState.errors.otp.message}
                      </p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Verifying...' : 'Verify code'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setPhoneSent(false)}
                  >
                    Back to phone input
                  </Button>
                </form>
              )}
            </TabsContent>

            <TabsContent value="google" className="space-y-4">
              <Button
                onClick={onGoogleSignIn}
                variant="outline"
                className="w-full"
                disabled={isLoading}
              >
                <Chrome className="h-4 w-4 mr-2" />
                {isLoading ? 'Signing in...' : 'Sign in with Google'}
              </Button>
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link href="/auth/register" className="text-blue-600 hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 