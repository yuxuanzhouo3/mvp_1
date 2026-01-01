'use client';

import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Heart, MessageCircle, Shield, Zap, Users, Star, Sparkles, Rocket } from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/components/language-provider'
import { useTranslations } from '@/lib/i18n'
import { useState, useEffect } from 'react'

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const { language } = useLanguage();
  const t = useTranslations(language);

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
              {t.home.badge}
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold mb-8 text-gray-900 dark:text-white leading-tight">
              {t.home.heroTitle}
              <br />
              <span className="text-gradient-theme">{t.home.heroSubtitle}</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-12 max-w-3xl mx-auto">
              {t.home.heroDescription}
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
              <Link href="/auth/register">
                <Button size="lg" className="btn-primary px-8 py-4 text-lg">
                  {t.home.startMatching}
                  <ArrowRight className="ml-3 h-6 w-6" />
                </Button>
              </Link>
              <Link href="/about">
                <Button variant="outline" size="lg" className="border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-8 py-4 rounded-lg text-lg">
                  {t.home.learnMore}
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">10K+</div>
                <div className="text-gray-600 dark:text-gray-400">{t.home.stats.activeUsers}</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary/80 mb-2">50K+</div>
                <div className="text-gray-600 dark:text-gray-400">{t.home.stats.conversations}</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">99%</div>
                <div className="text-gray-600 dark:text-gray-400">{t.home.stats.satisfactionRate}</div>
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
              {t.home.whyChoose}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              {t.home.featuresSubtitle}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="card-clean">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-6 mx-auto">
                  <Zap className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl mb-4 text-gray-900 dark:text-white">{t.home.features.smartMatching.title}</CardTitle>
                <CardDescription className="text-lg text-gray-600 dark:text-gray-300">
                  {t.home.features.smartMatching.description}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-clean">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-6 mx-auto">
                  <MessageCircle className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl mb-4 text-gray-900 dark:text-white">{t.home.features.realtimeChat.title}</CardTitle>
                <CardDescription className="text-lg text-gray-600 dark:text-gray-300">
                  {t.home.features.realtimeChat.description}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-clean">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-6 mx-auto">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl mb-4 text-gray-900 dark:text-white">{t.home.features.privacyFirst.title}</CardTitle>
                <CardDescription className="text-lg text-gray-600 dark:text-gray-300">
                  {t.home.features.privacyFirst.description}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-clean">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-6 mx-auto">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl mb-4 text-gray-900 dark:text-white">{t.home.features.growingCommunity.title}</CardTitle>
                <CardDescription className="text-lg text-gray-600 dark:text-gray-300">
                  {t.home.features.growingCommunity.description}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-clean">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-6 mx-auto">
                  <Heart className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl mb-4 text-gray-900 dark:text-white">{t.home.features.emotionalIntelligence.title}</CardTitle>
                <CardDescription className="text-lg text-gray-600 dark:text-gray-300">
                  {t.home.features.emotionalIntelligence.description}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-clean">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-6 mx-auto">
                  <Star className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl mb-4 text-gray-900 dark:text-white">{t.home.features.premiumExperience.title}</CardTitle>
                <CardDescription className="text-lg text-gray-600 dark:text-gray-300">
                  {t.home.features.premiumExperience.description}
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
              {t.home.howItWorks}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              {t.home.howItWorksSubtitle}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mb-6 mx-auto text-2xl font-bold text-white">
                1
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{t.home.steps.createProfile.title}</h3>
              <p className="text-gray-600 dark:text-gray-300">
                {t.home.steps.createProfile.description}
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mb-6 mx-auto text-2xl font-bold text-white">
                2
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{t.home.steps.aiMatching.title}</h3>
              <p className="text-gray-600 dark:text-gray-300">
                {t.home.steps.aiMatching.description}
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mb-6 mx-auto text-2xl font-bold text-white">
                3
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{t.home.steps.startChatting.title}</h3>
              <p className="text-gray-600 dark:text-gray-300">
                {t.home.steps.startChatting.description}
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
            <h2 className="text-4xl font-bold mb-6 text-white">{t.home.readyToFind}</h2>
            <p className="text-xl mb-10 text-primary-foreground/80 max-w-3xl mx-auto">
              {t.home.ctaDescription}
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link href="/auth/register">
                <Button size="lg" className="bg-white text-primary hover:bg-gray-100 px-8 py-4 rounded-lg text-lg">
                  {t.home.startJourney}
                  <Rocket className="ml-3 h-6 w-6" />
                </Button>
              </Link>
              <Link href="/demo">
                <Button size="lg" className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-primary px-8 py-4 rounded-lg text-lg">
                  {t.home.tryDemo}
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
              <Link href="/privacy" className="hover:text-primary transition-colors">{t.footer.privacy}</Link>
              <Link href="/terms" className="hover:text-primary transition-colors">{t.footer.terms}</Link>
              <Link href="/support" className="hover:text-primary transition-colors">{t.footer.support}</Link>
              <Link href="/about" className="hover:text-primary transition-colors">{t.footer.about}</Link>
            </div>
          </div>
          <div className="text-center text-sm text-gray-400">
            {t.footer.copyright}
          </div>
        </div>
      </footer>
    </div>
  )
}
