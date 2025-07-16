'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, Phone, Chrome, Eye, EyeOff, Sparkles, Shield } from 'lucide-react';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [phoneSent, setPhoneSent] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [activeTab, setActiveTab] = useState('email');
  const [showPassword, setShowPassword] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);
  const hasRedirectedRef = useRef(false);
  
  const router = useRouter();
  const { signIn, signInWithGoogle, signInWithPhone, verifyPhoneOTP, user } = useAuth();
  const { toast } = useToast();

  // Redirect if already logged in - Robust redirect prevention with auth settling
  useEffect(() => {
    console.log('🔄 LoginPage useEffect triggered - User state changed:', user);
    console.log('📊 Current user object:', user);
    console.log('🎯 Current loading state:', isLoading);
    console.log('🔄 Has redirected state:', hasRedirected);
    console.log('🔄 Has redirected ref:', hasRedirectedRef.current);
    
    // Add a small delay to allow auth state to fully settle
    const timer = setTimeout(() => {
      // Only redirect if user exists, we haven't already redirected, and we're not loading
      if (user && !hasRedirected && !hasRedirectedRef.current && !isLoading) {
        console.log('✅ User authenticated, redirecting to dashboard...');
        console.log('🚀 Router.replace called with /dashboard');
        setHasRedirected(true);
        hasRedirectedRef.current = true; // Double protection
        
        // Use window.location for more reliable redirect
        if (typeof window !== 'undefined') {
          window.location.href = '/dashboard';
        } else {
          router.replace('/dashboard');
        }
      } else if (!user && (hasRedirected || hasRedirectedRef.current)) {
        console.log('❌ User logged out, resetting redirect state');
        setHasRedirected(false);
        hasRedirectedRef.current = false; // Reset both when user actually logs out
      }
    }, 100); // Small delay to ensure auth state is settled

    return () => clearTimeout(timer);
  }, [user, router, isLoading, hasRedirected]);

  // Reset loading state if user state changes
  useEffect(() => {
    if (user && isLoading) {
      console.log('🔄 User authenticated, resetting loading state');
      setIsLoading(false);
    }
  }, [user, isLoading]);

  const onEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('📝 Login form submitted');
    console.log('📧 Email:', email);
    console.log('🔑 Password length:', password.length);
    console.log('🎭 Mock mode check - URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('🎭 Mock mode check - Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 10) + '...');
    
    setIsLoading(true);
    console.log('⏳ Loading state set to true');
    console.log('🔐 Attempting to sign in with email:', email);
    
    // Basic validation
    if (!email || !password) {
      console.log('❌ Validation failed: Empty fields');
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      console.log('❌ Validation failed: Password too short');
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    try {
      console.log('🚀 Calling signIn function...');
      const { error } = await signIn(email, password);
      console.log('📡 SignIn response:', { error });
      
      if (error) {
        console.log('❌ SignIn failed:', error.message);
        toast({
          title: 'Login failed',
          description: error.message,
          variant: 'destructive',
        });
        setIsLoading(false);
      } else {
        console.log('✅ SignIn successful!');
        toast({
          title: 'Success',
          description: 'Welcome back!',
        });
        console.log('⏳ Waiting for user state update...');
        console.log('🔄 User state should update automatically via AuthProvider');
        
        // Immediate redirect after successful login
        console.log('🚀 Immediate redirect to dashboard...');
        setHasRedirected(true);
        hasRedirectedRef.current = true;
        
        // Use window.location for immediate redirect
        if (typeof window !== 'undefined') {
          console.log('🌐 Using window.location redirect...');
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 500); // Small delay to show success message
        } else {
          router.replace('/dashboard');
        }
        
        // Add manual redirect button for testing
        console.log('🔧 Adding manual redirect option...');
        if (typeof window !== 'undefined') {
          const manualRedirect = () => {
            console.log('🔧 Manual redirect triggered');
            window.location.href = '/dashboard';
          };
          
          // Add a temporary button for manual redirect
          setTimeout(() => {
            const existingButton = document.getElementById('manual-redirect-btn');
            if (!existingButton) {
              const button = document.createElement('button');
              button.id = 'manual-redirect-btn';
              button.textContent = 'Manual Redirect to Dashboard';
              button.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #ff6b6b;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                z-index: 9999;
                font-size: 14px;
              `;
              button.onclick = manualRedirect;
              document.body.appendChild(button);
              
              // Auto-remove after 10 seconds
              setTimeout(() => {
                if (button.parentNode) {
                  button.parentNode.removeChild(button);
                }
              }, 10000);
            }
          }, 1000);
        }
        
        // Fallback redirect mechanism
        setTimeout(() => {
          console.log('⏰ Fallback redirect check - User state:', user);
          if (!hasRedirected && !hasRedirectedRef.current) {
            console.log('🔄 Fallback redirect triggered');
            setHasRedirected(true);
            hasRedirectedRef.current = true;
            if (typeof window !== 'undefined') {
              window.location.href = '/dashboard';
            } else {
              router.replace('/dashboard');
            }
          }
          console.log('⏰ Timeout reached, resetting loading state');
          setIsLoading(false);
        }, 2000);
      }
    } catch (error) {
      console.log('💥 Unexpected error during signIn:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
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
          title: 'Google sign-in failed',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Welcome! Redirecting to dashboard...',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred during Google sign-in',
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
          title: 'Phone sign-in not available',
          description: error.message,
          variant: 'destructive',
        });
        setIsLoading(false);
      } else {
        setPhoneSent(true);
        setPhoneNumber(phone);
        toast({
          title: 'Mock Mode',
          description: 'In mock mode, enter any 6-digit code',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Phone sign-in is not available in mock mode',
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
      // In mock mode, any 6-digit code works
      toast({
        title: 'Success',
        description: 'Phone verification successful!',
      });
      // Mock successful login
      const { error } = await signIn('test@personalink.ai', 'test123');
      if (!error) {
        // The redirect will happen automatically via useEffect
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
              <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-lg">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white drop-shadow-lg">
                PersonaLink
              </h1>
            </div>
            <CardTitle className="text-3xl font-bold text-white mb-2">
              Welcome back
            </CardTitle>
            <CardDescription className="text-white text-lg font-medium drop-shadow-sm">
              Sign in to your account and start connecting
            </CardDescription>
            
            {/* Google Sign-in Button - Moved to header */}
            <Button
              type="button"
              onClick={onGoogleSignIn}
              variant="outline"
              className="w-full bg-white text-gray-700 border-gray-300 hover:bg-gray-50 font-medium py-3 rounded-lg shadow-sm transition-all duration-300"
              disabled={isLoading}
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">or</span>
              </div>
            </div>
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
                <form onSubmit={onEmailSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-purple-400 transition-colors" />
                      </div>
                      <Input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-purple-500 focus:ring-purple-500/50 focus:bg-white transition-all duration-300 shadow-lg"
                        required
                        disabled={isLoading}
                        autoComplete="email"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-purple-400 transition-colors" />
                      </div>
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10 bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-purple-500 focus:ring-purple-500/50 focus:bg-white transition-all duration-300 shadow-lg"
                        required
                        disabled={isLoading}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-purple-400 transition-colors"
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
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Signing in...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Shield className="h-4 w-4" />
                        <span>Sign in</span>
                      </div>
                    )}
                  </Button>
                </form>
                
                <div className="text-center">
                  <Link 
                    href="/auth/forgot-password" 
                    className="text-sm text-purple-300 hover:text-purple-200 transition-colors duration-200 underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </Link>
                </div>
              </TabsContent>

              <TabsContent value="phone" className="space-y-6 mt-6">
                {!phoneSent ? (
                  <form onSubmit={onPhoneSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Phone className="h-5 w-5 text-gray-400 group-focus-within:text-purple-400 transition-colors" />
                        </div>
                        <Input
                          type="tel"
                          placeholder="Enter your phone number"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="pl-10 bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-purple-500 focus:ring-purple-500/50 focus:bg-white transition-all duration-300 shadow-lg"
                          required
                          disabled={isLoading}
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
                          <span>Sending SMS...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4" />
                          <span>Send verification code</span>
                        </div>
                      )}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={onOTPSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Input
                        type="text"
                        placeholder="Enter 6-digit code"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        maxLength={6}
                        className="bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-purple-500 focus:ring-purple-500/50 focus:bg-white transition-all duration-300 shadow-lg text-center text-lg font-mono"
                        required
                        disabled={isLoading}
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Verifying...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <Shield className="h-4 w-4" />
                          <span>Verify code</span>
                        </div>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-white/20 text-white hover:bg-white/10 transition-all duration-300"
                      onClick={() => {
                        setPhoneSent(false);
                        setOtp('');
                      }}
                      disabled={isLoading}
                    >
                      Back to phone number
                    </Button>
                  </form>
                )}
              </TabsContent>
            </Tabs>



            <div className="text-center pt-4">
              <p className="text-sm text-gray-300">
                Don't have an account?{' '}
                <Link 
                  href="/auth/register" 
                  className="text-purple-300 hover:text-purple-200 transition-colors duration-200 underline-offset-4 hover:underline font-medium"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 