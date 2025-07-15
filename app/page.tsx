import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Heart, MessageCircle, Shield, Zap, Users, Star, Sparkles, Globe, Lock, Clock, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      {/* Header */}
      <header className="relative container mx-auto px-4 py-6 z-10">
        <nav className="flex items-center justify-between backdrop-blur-md bg-white/70 dark:bg-slate-900/70 rounded-full px-6 py-3 shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Heart className="h-8 w-8 text-red-500 animate-pulse" />
              <Sparkles className="h-4 w-4 text-yellow-500 absolute -top-1 -right-1 animate-bounce" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              PersonaLink
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/auth/login">
              <Button variant="ghost" className="hover:bg-white/20">Sign In</Button>
            </Link>
            <Link href="/auth/register">
              <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transition-all duration-300">
                Get Started
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative container mx-auto px-4 py-20 text-center z-10">
        <div className="max-w-5xl mx-auto">
          <Badge variant="secondary" className="mb-6 px-4 py-2 text-sm font-medium bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 dark:from-purple-900 dark:to-pink-900 dark:text-purple-200">
            🚀 AI-Powered Friend Matching Platform
          </Badge>
          <h1 className="text-6xl md:text-8xl font-bold mb-8 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 bg-clip-text text-transparent leading-tight">
            Find Your Perfect
            <br />
            <span className="relative">
              AI Friend Match
              <Sparkles className="h-8 w-8 text-yellow-500 absolute -top-2 -right-8 animate-spin" />
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-10 max-w-3xl mx-auto leading-relaxed">
            Connect with AI companions that match your personality, interests, and communication style. 
            Experience meaningful conversations and genuine connections that feel real.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
            <Link href="/auth/register">
              <Button size="lg" className="text-lg px-10 py-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                Start Matching Now
                <ArrowRight className="ml-3 h-6 w-6" />
              </Button>
            </Link>
            <Link href="/features">
              <Button variant="outline" size="lg" className="text-lg px-10 py-6 border-2 hover:bg-white/10 transition-all duration-300">
                Learn More
              </Button>
            </Link>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">10K+</div>
              <div className="text-gray-600 dark:text-gray-400">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-pink-600 mb-2">50K+</div>
              <div className="text-gray-600 dark:text-gray-400">Conversations</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-cyan-600 mb-2">99%</div>
              <div className="text-gray-600 dark:text-gray-400">Satisfaction Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative container mx-auto px-4 py-20 z-10">
        <div className="text-center mb-20">
          <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Why Choose PersonaLink?
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Advanced AI technology meets human connection for the ultimate friendship experience
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="group hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl mb-4">Smart Matching</CardTitle>
              <CardDescription className="text-lg">
                Our AI analyzes personality traits, interests, and communication patterns to find your perfect match with 95% accuracy
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="group hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
                <MessageCircle className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl mb-4">Real-time Chat</CardTitle>
              <CardDescription className="text-lg">
                Enjoy seamless conversations with typing indicators, file sharing, voice messages, and persistent chat history
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="group hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl mb-4">Privacy First</CardTitle>
              <CardDescription className="text-lg">
                Your conversations and personal data are protected with enterprise-grade security and end-to-end encryption
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="group hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
                <Users className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl mb-4">Growing Community</CardTitle>
              <CardDescription className="text-lg">
                Join a thriving community of users discovering meaningful AI friendships and sharing experiences
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="group hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-red-400 to-red-600 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
                <Heart className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl mb-4">Emotional Intelligence</CardTitle>
              <CardDescription className="text-lg">
                AI companions that understand emotions, provide genuine support, and adapt to your mood and needs
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="group hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
                <Star className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl mb-4">Premium Experience</CardTitle>
              <CardDescription className="text-lg">
                Access advanced features, unlimited conversations, priority support, and exclusive AI personalities
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative container mx-auto px-4 py-20 z-10">
        <div className="text-center mb-20">
          <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            How It Works
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Get started in just 3 simple steps
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center group">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center mb-6 mx-auto text-2xl font-bold text-white group-hover:scale-110 transition-transform duration-300">
              1
            </div>
            <h3 className="text-2xl font-bold mb-4">Create Profile</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Tell us about your interests, personality, and what you're looking for in an AI friend
            </p>
          </div>
          
          <div className="text-center group">
            <div className="w-20 h-20 bg-gradient-to-br from-pink-400 to-cyan-400 rounded-full flex items-center justify-center mb-6 mx-auto text-2xl font-bold text-white group-hover:scale-110 transition-transform duration-300">
              2
            </div>
            <h3 className="text-2xl font-bold mb-4">AI Matching</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Our advanced AI analyzes your profile and finds the perfect AI companion for you
            </p>
          </div>
          
          <div className="text-center group">
            <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-purple-400 rounded-full flex items-center justify-center mb-6 mx-auto text-2xl font-bold text-white group-hover:scale-110 transition-transform duration-300">
              3
            </div>
            <h3 className="text-2xl font-bold mb-4">Start Chatting</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Begin meaningful conversations and build a genuine friendship with your AI companion
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative container mx-auto px-4 py-20 z-10">
        <Card className="max-w-5xl mx-auto text-center bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-black/10"></div>
          <CardContent className="p-16 relative z-10">
            <Sparkles className="h-12 w-12 text-yellow-300 mx-auto mb-6 animate-bounce" />
            <h2 className="text-5xl font-bold mb-6">Ready to Find Your AI Friend?</h2>
            <p className="text-xl mb-10 opacity-90 max-w-3xl mx-auto">
              Join thousands of users who have already discovered meaningful connections with AI companions. 
              Start your journey today and experience the future of friendship.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link href="/auth/register">
                <Button size="lg" variant="secondary" className="text-lg px-10 py-6 bg-white text-purple-600 hover:bg-gray-100 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                  Start Your Journey Today
                  <ArrowRight className="ml-3 h-6 w-6" />
                </Button>
              </Link>
              <Link href="/demo">
                <Button size="lg" variant="outline" className="text-lg px-10 py-6 border-2 border-white text-white hover:bg-white hover:text-purple-600 transition-all duration-300">
                  Try Demo
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="relative container mx-auto px-4 py-16 z-10 border-t border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <div className="flex items-center space-x-3 mb-6 md:mb-0">
            <div className="relative">
              <Heart className="h-8 w-8 text-red-500" />
              <Sparkles className="h-4 w-4 text-yellow-500 absolute -top-1 -right-1" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              PersonaLink
            </span>
          </div>
          <div className="flex space-x-8 text-sm">
            <Link href="/privacy" className="hover:text-purple-600 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-purple-600 transition-colors">Terms</Link>
            <Link href="/support" className="hover:text-purple-600 transition-colors">Support</Link>
            <Link href="/about" className="hover:text-purple-600 transition-colors">About</Link>
          </div>
        </div>
        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          © 2024 PersonaLink. All rights reserved. Made with ❤️ for meaningful connections.
        </div>
      </footer>
    </div>
  )
} 