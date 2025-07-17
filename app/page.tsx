'use client';

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Heart, MessageCircle, Shield, Zap, Users, Star, Sparkles, Rocket } from 'lucide-react'
import Link from 'next/link'
import { useTheme } from '@/context/ThemeProvider'
import { getTranslation } from '@/lib/translations'
import { useState, useEffect } from 'react'

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  // Handle theme context safely
  let theme: 'blue' = 'blue';
  let language: 'en' | 'zh' | 'ja' | 'ko' = 'en';
  let colorMode: 'light' | 'dark' = 'light';
  
  try {
    const themeContext = useTheme();
    theme = themeContext.theme;
    language = themeContext.language;
    colorMode = themeContext.colorMode;
  } catch (error) {
    // Fallback values if theme context is not available
    // Values are already set above
  }

  const t = (key: string) => getTranslation(language, key);

  // Set mounted state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch
  if (!mounted) {
    return <div className="min-h-screen bg-white dark:bg-gray-950" suppressHydrationWarning />;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10">
        <div className="container mx-auto px-4 text-center">
      <div className="max-w-4xl mx-auto">
            <Badge className="mb-6 bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary px-4 py-2 rounded-full">
              🚀 AI-Powered Friend Matching Platform
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold mb-8 text-gray-900 dark:text-white leading-tight">
              Find Your Ideal
              <br />
              <span className="text-gradient-theme">AI Friend Match</span>
        </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-12 max-w-3xl mx-auto">
              Connect with AI companions that match your personality, interests, and communication style. Experience meaningful conversations and genuine connections that feel real.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
              <Link href="/auth/register">
                <Button size="lg" className="btn-primary px-8 py-4 text-lg">
                  Start Matching Now
                  <ArrowRight className="ml-3 h-6 w-6" />
                </Button>
              </Link>
              <Link href="/features">
                <Button variant="outline" size="lg" className="border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-8 py-4 rounded-lg text-lg">
                  Learn More
                </Button>
              </Link>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">10K+</div>
                <div className="text-gray-600 dark:text-gray-400">Active Users</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary/80 mb-2">50K+</div>
                <div className="text-gray-600 dark:text-gray-400">Conversations</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">99%</div>
                <div className="text-gray-600 dark:text-gray-400">Satisfaction Rate</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-gray-950">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6 text-gray-900 dark:text-white">
              Why Choose PersonaLink?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Advanced AI technology meets human connection for the ultimate friendship experience
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="card-clean">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-6 mx-auto">
                  <Zap className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl mb-4 text-gray-900 dark:text-white">Smart Matching</CardTitle>
                <CardDescription className="text-lg text-gray-600 dark:text-gray-300">
                  Our AI analyzes personality traits, interests, and communication patterns to find your perfect match with 95% accuracy
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-clean">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-6 mx-auto">
                  <MessageCircle className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl mb-4 text-gray-900 dark:text-white">Real-time Chat</CardTitle>
                <CardDescription className="text-lg text-gray-600 dark:text-gray-300">
                  Enjoy seamless conversations with typing indicators, file sharing, voice messages, and persistent chat history
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-clean">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-6 mx-auto">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl mb-4 text-gray-900 dark:text-white">Privacy First</CardTitle>
                <CardDescription className="text-lg text-gray-600 dark:text-gray-300">
                  Your conversations and personal data are protected with enterprise-grade security and end-to-end encryption
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-clean">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-6 mx-auto">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl mb-4 text-gray-900 dark:text-white">Growing Community</CardTitle>
                <CardDescription className="text-lg text-gray-600 dark:text-gray-300">
                  Join a thriving community of users discovering meaningful AI friendships and sharing experiences
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-clean">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-6 mx-auto">
                  <Heart className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl mb-4 text-gray-900 dark:text-white">Emotional Intelligence</CardTitle>
                <CardDescription className="text-lg text-gray-600 dark:text-gray-300">
                  AI companions that understand emotions, provide genuine support, and adapt to your mood and needs
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-clean">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-6 mx-auto">
                  <Star className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl mb-4 text-gray-900 dark:text-white">Premium Experience</CardTitle>
                <CardDescription className="text-lg text-gray-600 dark:text-gray-300">
                  Access advanced features, unlimited conversations, priority support, and exclusive AI personalities
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6 text-gray-900 dark:text-white">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Get started in just 3 simple steps
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mb-6 mx-auto text-2xl font-bold text-white">
                1
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Create Profile</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Tell us about your interests, personality, and what you're looking for in an AI friend
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mb-6 mx-auto text-2xl font-bold text-white">
                2
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">AI Matching</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Our advanced AI analyzes your profile and finds the perfect AI companion for you
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mb-6 mx-auto text-2xl font-bold text-white">
                3
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Start Chatting</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Begin meaningful conversations and build a genuine friendship with your AI companion
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <Sparkles className="h-12 w-12 text-white mx-auto mb-6" />
            <h2 className="text-4xl font-bold mb-6 text-white">Ready to Find Your AI Friend?</h2>
            <p className="text-xl mb-10 text-primary-foreground/80 max-w-3xl mx-auto">
              Join thousands of users who have already discovered meaningful connections with AI companions. Start your journey today and experience the future of friendship.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link href="/auth/register">
                <Button size="lg" className="bg-white text-primary hover:bg-gray-100 px-8 py-4 rounded-lg text-lg">
                  Start Your Journey Today
                  <Rocket className="ml-3 h-6 w-6" />
                </Button>
              </Link>
              <Link href="/demo">
                <Button size="lg" className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-primary px-8 py-4 rounded-lg text-lg">
                  Try Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 bg-gray-900 text-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8">
            <div className="flex items-center space-x-3 mb-6 md:mb-0">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Heart className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold">
                PersonaLink
              </span>
            </div>
            <div className="flex space-x-8 text-sm">
              <Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
              <Link href="/support" className="hover:text-primary transition-colors">Support</Link>
              <Link href="/about" className="hover:text-primary transition-colors">About</Link>
            </div>
          </div>
          <div className="text-center text-sm text-gray-400">
            © 2024 PersonaLink. All rights reserved. Made with ❤️ for meaningful connections.
        </div>
      </div>
      </footer>

      {/* Theme Controls */}
      {/* The ThemeControls component is removed as per the edit hint */}
    </div>
  )
} 