'use client';

import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Heart, MessageCircle, Shield, Zap, Users, Star, Sparkles, Rocket } from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/components/language-provider'
import { useTranslations } from '@/lib/i18n'
import { isChinaDeployment } from '@/lib/config/deployment.config'
import { getBrandName } from '@/lib/config/branding.config'
import { useState, useEffect, useRef } from 'react'

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const { language } = useLanguage();
  const t = useTranslations(language);
  const featuresRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);

  // Set mounted state
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const container = featuresRef.current;
    if (!mounted || !container) return;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    const connection = (navigator as any).connection;
    const saveData = !!connection?.saveData;
    const cores = typeof navigator.hardwareConcurrency === 'number' ? navigator.hardwareConcurrency : 8;
    const lowEnd = saveData || cores <= 4;
    if (reduceMotion) return;

    let active = false;
    let visible = document.visibilityState === 'visible';
    let raf: number | null = null;
    let scrollPos = 0;
    let last = performance.now();
    const pxPerFrame = lowEnd ? 0.35 : 1;
    const frameIntervalMs = lowEnd ? 1000 / 30 : 1000 / 60;

    const stop = () => {
      if (raf !== null) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    };

    const tick = (now: number) => {
      if (!active || !visible) {
        stop();
        return;
      }

      if (now - last >= frameIntervalMs) {
        scrollPos += pxPerFrame;
        const maxScroll = container.scrollWidth / 2;
        if (maxScroll > 0) {
          container.scrollLeft = scrollPos % maxScroll;
        }
        last = now;
      }

      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (raf !== null) return;
      raf = requestAnimationFrame(tick);
    };

    const onVis = () => {
      visible = document.visibilityState === 'visible';
      if (active && visible) start();
      else stop();
    };

    const io = new IntersectionObserver(
      (entries) => {
        active = !!entries[0]?.isIntersecting;
        if (active && visible) start();
        else stop();
      },
      { threshold: 0.1 }
    );

    io.observe(container);
    document.addEventListener('visibilitychange', onVis);
    onVis();

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVis);
      io.disconnect();
    };
  }, [mounted]);

  useEffect(() => {
    const container = stepsRef.current;
    if (!mounted || !container) return;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    const connection = (navigator as any).connection;
    const saveData = !!connection?.saveData;
    const cores = typeof navigator.hardwareConcurrency === 'number' ? navigator.hardwareConcurrency : 8;
    const lowEnd = saveData || cores <= 4;
    if (reduceMotion) return;

    let active = false;
    let visible = document.visibilityState === 'visible';
    let raf: number | null = null;
    let scrollPos = 0;
    let last = performance.now();
    const pxPerFrame = lowEnd ? 0.35 : 1;
    const frameIntervalMs = lowEnd ? 1000 / 30 : 1000 / 60;

    const stop = () => {
      if (raf !== null) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    };

    const tick = (now: number) => {
      if (!active || !visible) {
        stop();
        return;
      }

      if (now - last >= frameIntervalMs) {
        scrollPos += pxPerFrame;
        const maxScroll = container.scrollWidth / 2;
        if (maxScroll > 0) {
          container.scrollLeft = scrollPos % maxScroll;
        }
        last = now;
      }

      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (raf !== null) return;
      raf = requestAnimationFrame(tick);
    };

    const onVis = () => {
      visible = document.visibilityState === 'visible';
      if (active && visible) start();
      else stop();
    };

    const io = new IntersectionObserver(
      (entries) => {
        active = !!entries[0]?.isIntersecting;
        if (active && visible) start();
        else stop();
      },
      { threshold: 0.1 }
    );

    io.observe(container);
    document.addEventListener('visibilitychange', onVis);
    onVis();

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVis);
      io.disconnect();
    };
  }, [mounted]);

  // Prevent hydration mismatch
  if (!mounted) {
    return <div className="min-h-screen bg-white dark:bg-gray-950" suppressHydrationWarning />;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-12 md:py-20 bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-16 -left-16 h-72 w-72 rounded-full bg-primary/20 blur-3xl motion-safe:animate-blob motion-reduce:animate-none" />
          <div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-primary/15 blur-3xl motion-safe:animate-blob motion-safe:animation-delay-2000 motion-reduce:animate-none" />
          <div className="absolute top-1/3 -right-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl motion-safe:animate-blob motion-safe:animation-delay-4000 motion-reduce:animate-none" />
        </div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="max-w-4xl mx-auto motion-safe:fade-in motion-reduce:animate-none">
            <Badge className="mb-4 md:mb-6 bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary px-3 py-1.5 md:px-4 md:py-2 rounded-full text-sm">
              {t.home.badge}
            </Badge>
            <h1 className="text-3xl sm:text-4xl md:text-7xl font-bold mb-4 md:mb-8 text-gray-900 dark:text-white leading-tight px-2">
              {t.home.heroTitle}
              <br />
              <span className="text-gradient-theme">{t.home.heroSubtitle}</span>
            </h1>
            <p className="text-base md:text-xl text-gray-600 dark:text-gray-300 mb-6 md:mb-12 max-w-3xl mx-auto px-4">
              {t.home.heroDescription}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-6 justify-center mb-8 md:mb-16 px-4">
              <Link href="/auth/register" className="w-full sm:w-auto">
                <Button size="lg" className="btn-primary w-full sm:w-auto px-6 md:px-8 py-3 md:py-4 text-base md:text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                  {t.home.startMatching}
                  <ArrowRight className="ml-2 md:ml-3 h-5 w-5 md:h-6 md:w-6" />
                </Button>
              </Link>
              <Link href="/about" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-6 md:px-8 py-3 md:py-4 rounded-lg text-base md:text-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-all duration-300">
                  {t.home.learnMore}
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 md:gap-8 max-w-3xl mx-auto motion-safe:slide-up motion-reduce:animate-none px-4">
              <div className="text-center transform hover:scale-110 transition-transform duration-300">
                <div className="text-2xl md:text-4xl font-bold text-primary mb-1 md:mb-2">10K+</div>
                <div className="text-xs md:text-base text-gray-600 dark:text-gray-400">{t.home.stats.activeUsers}</div>
              </div>
              <div className="text-center transform hover:scale-110 transition-transform duration-300">
                <div className="text-2xl md:text-4xl font-bold text-primary/80 mb-1 md:mb-2">50K+</div>
                <div className="text-xs md:text-base text-gray-600 dark:text-gray-400">{t.home.stats.conversations}</div>
              </div>
              <div className="text-center transform hover:scale-110 transition-transform duration-300">
                <div className="text-2xl md:text-4xl font-bold text-primary mb-1 md:mb-2">99%</div>
                <div className="text-xs md:text-base text-gray-600 dark:text-gray-400">{t.home.stats.satisfactionRate}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 md:py-20 bg-white dark:bg-gray-950">
        <div className="container mx-auto md:px-4">
          <div className="text-center mb-8 md:mb-16 px-4">
            <h2 className="text-2xl md:text-4xl font-bold mb-3 md:mb-6 text-gray-900 dark:text-white">
              {t.home.whyChoose}
            </h2>
            <p className="text-base md:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              {t.home.featuresSubtitle}
            </p>
          </div>

          <div ref={featuresRef} className="flex overflow-x-auto gap-4 px-4 pb-4 scrollbar-hide md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-8 md:overflow-visible">
            {/* First set of cards */}
            <Card className="card-clean transition-all duration-300 hover:-translate-y-2 hover:shadow-xl min-w-[280px] md:min-w-0 flex-shrink-0">
              <CardHeader className="text-center p-4 md:p-6">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-3 md:mb-6 mx-auto transform transition-transform duration-300 hover:scale-110 hover:rotate-6">
                  <Zap className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                </div>
                <CardTitle className="text-lg md:text-2xl mb-2 md:mb-4 text-gray-900 dark:text-white">{t.home.features.smartMatching.title}</CardTitle>
                <CardDescription className="text-sm md:text-lg text-gray-600 dark:text-gray-300">
                  {t.home.features.smartMatching.description}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-clean transition-all duration-300 hover:-translate-y-2 hover:shadow-xl min-w-[280px] md:min-w-0 flex-shrink-0">
              <CardHeader className="text-center p-4 md:p-6">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-3 md:mb-6 mx-auto transform transition-transform duration-300 hover:scale-110 hover:rotate-6">
                  <MessageCircle className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                </div>
                <CardTitle className="text-lg md:text-2xl mb-2 md:mb-4 text-gray-900 dark:text-white">{t.home.features.realtimeChat.title}</CardTitle>
                <CardDescription className="text-sm md:text-lg text-gray-600 dark:text-gray-300">
                  {t.home.features.realtimeChat.description}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-clean transition-all duration-300 hover:-translate-y-2 hover:shadow-xl min-w-[280px] md:min-w-0 flex-shrink-0">
              <CardHeader className="text-center p-4 md:p-6">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-3 md:mb-6 mx-auto transform transition-transform duration-300 hover:scale-110 hover:rotate-6">
                  <Shield className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                </div>
                <CardTitle className="text-lg md:text-2xl mb-2 md:mb-4 text-gray-900 dark:text-white">{t.home.features.privacyFirst.title}</CardTitle>
                <CardDescription className="text-sm md:text-lg text-gray-600 dark:text-gray-300">
                  {t.home.features.privacyFirst.description}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-clean transition-all duration-300 hover:-translate-y-2 hover:shadow-xl min-w-[280px] md:min-w-0 flex-shrink-0">
              <CardHeader className="text-center p-4 md:p-6">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-3 md:mb-6 mx-auto transform transition-transform duration-300 hover:scale-110 hover:rotate-6">
                  <Users className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                </div>
                <CardTitle className="text-lg md:text-2xl mb-2 md:mb-4 text-gray-900 dark:text-white">{t.home.features.growingCommunity.title}</CardTitle>
                <CardDescription className="text-sm md:text-lg text-gray-600 dark:text-gray-300">
                  {t.home.features.growingCommunity.description}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-clean transition-all duration-300 hover:-translate-y-2 hover:shadow-xl min-w-[280px] md:min-w-0 flex-shrink-0">
              <CardHeader className="text-center p-4 md:p-6">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-3 md:mb-6 mx-auto transform transition-transform duration-300 hover:scale-110 hover:rotate-6">
                  <Heart className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                </div>
                <CardTitle className="text-lg md:text-2xl mb-2 md:mb-4 text-gray-900 dark:text-white">{t.home.features.emotionalIntelligence.title}</CardTitle>
                <CardDescription className="text-sm md:text-lg text-gray-600 dark:text-gray-300">
                  {t.home.features.emotionalIntelligence.description}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-clean transition-all duration-300 hover:-translate-y-2 hover:shadow-xl min-w-[280px] md:min-w-0 flex-shrink-0">
              <CardHeader className="text-center p-4 md:p-6">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-3 md:mb-6 mx-auto transform transition-transform duration-300 hover:scale-110 hover:rotate-6">
                  <Star className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                </div>
                <CardTitle className="text-lg md:text-2xl mb-2 md:mb-4 text-gray-900 dark:text-white">{t.home.features.premiumExperience.title}</CardTitle>
                <CardDescription className="text-sm md:text-lg text-gray-600 dark:text-gray-300">
                  {t.home.features.premiumExperience.description}
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Duplicate set for seamless loop */}
            <Card className="card-clean transition-all duration-300 hover:-translate-y-2 hover:shadow-xl min-w-[280px] md:min-w-0 flex-shrink-0 md:hidden">
              <CardHeader className="text-center p-4 md:p-6">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-3 md:mb-6 mx-auto transform transition-transform duration-300 hover:scale-110 hover:rotate-6">
                  <Zap className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                </div>
                <CardTitle className="text-lg md:text-2xl mb-2 md:mb-4 text-gray-900 dark:text-white">{t.home.features.smartMatching.title}</CardTitle>
                <CardDescription className="text-sm md:text-lg text-gray-600 dark:text-gray-300">
                  {t.home.features.smartMatching.description}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-clean transition-all duration-300 hover:-translate-y-2 hover:shadow-xl min-w-[280px] md:min-w-0 flex-shrink-0 md:hidden">
              <CardHeader className="text-center p-4 md:p-6">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-3 md:mb-6 mx-auto transform transition-transform duration-300 hover:scale-110 hover:rotate-6">
                  <MessageCircle className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                </div>
                <CardTitle className="text-lg md:text-2xl mb-2 md:mb-4 text-gray-900 dark:text-white">{t.home.features.realtimeChat.title}</CardTitle>
                <CardDescription className="text-sm md:text-lg text-gray-600 dark:text-gray-300">
                  {t.home.features.realtimeChat.description}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-clean transition-all duration-300 hover:-translate-y-2 hover:shadow-xl min-w-[280px] md:min-w-0 flex-shrink-0 md:hidden">
              <CardHeader className="text-center p-4 md:p-6">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-3 md:mb-6 mx-auto transform transition-transform duration-300 hover:scale-110 hover:rotate-6">
                  <Shield className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                </div>
                <CardTitle className="text-lg md:text-2xl mb-2 md:mb-4 text-gray-900 dark:text-white">{t.home.features.privacyFirst.title}</CardTitle>
                <CardDescription className="text-sm md:text-lg text-gray-600 dark:text-gray-300">
                  {t.home.features.privacyFirst.description}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-clean transition-all duration-300 hover:-translate-y-2 hover:shadow-xl min-w-[280px] md:min-w-0 flex-shrink-0 md:hidden">
              <CardHeader className="text-center p-4 md:p-6">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-3 md:mb-6 mx-auto transform transition-transform duration-300 hover:scale-110 hover:rotate-6">
                  <Users className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                </div>
                <CardTitle className="text-lg md:text-2xl mb-2 md:mb-4 text-gray-900 dark:text-white">{t.home.features.growingCommunity.title}</CardTitle>
                <CardDescription className="text-sm md:text-lg text-gray-600 dark:text-gray-300">
                  {t.home.features.growingCommunity.description}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-clean transition-all duration-300 hover:-translate-y-2 hover:shadow-xl min-w-[280px] md:min-w-0 flex-shrink-0 md:hidden">
              <CardHeader className="text-center p-4 md:p-6">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-3 md:mb-6 mx-auto transform transition-transform duration-300 hover:scale-110 hover:rotate-6">
                  <Heart className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                </div>
                <CardTitle className="text-lg md:text-2xl mb-2 md:mb-4 text-gray-900 dark:text-white">{t.home.features.emotionalIntelligence.title}</CardTitle>
                <CardDescription className="text-sm md:text-lg text-gray-600 dark:text-gray-300">
                  {t.home.features.emotionalIntelligence.description}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-clean transition-all duration-300 hover:-translate-y-2 hover:shadow-xl min-w-[280px] md:min-w-0 flex-shrink-0 md:hidden">
              <CardHeader className="text-center p-4 md:p-6">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-3 md:mb-6 mx-auto transform transition-transform duration-300 hover:scale-110 hover:rotate-6">
                  <Star className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                </div>
                <CardTitle className="text-lg md:text-2xl mb-2 md:mb-4 text-gray-900 dark:text-white">{t.home.features.premiumExperience.title}</CardTitle>
                <CardDescription className="text-sm md:text-lg text-gray-600 dark:text-gray-300">
                  {t.home.features.premiumExperience.description}
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-12 md:py-20 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto md:px-4">
          <div className="text-center mb-8 md:mb-16 px-4">
            <h2 className="text-2xl md:text-4xl font-bold mb-3 md:mb-6 text-gray-900 dark:text-white">
              {t.home.howItWorks}
            </h2>
            <p className="text-base md:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              {t.home.howItWorksSubtitle}
            </p>
          </div>

          <div ref={stepsRef} className="flex overflow-x-auto gap-6 px-4 pb-4 scrollbar-hide md:grid md:grid-cols-3 md:gap-8 md:overflow-visible max-w-4xl mx-auto">
            {/* First set */}
            <div className="text-center transform transition-all duration-300 hover:scale-105 min-w-[280px] md:min-w-0 flex-shrink-0">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-primary rounded-full flex items-center justify-center mb-4 md:mb-6 mx-auto text-xl md:text-2xl font-bold text-white shadow-lg hover:shadow-xl transition-shadow duration-300">
                1
              </div>
              <h3 className="text-lg md:text-2xl font-bold mb-2 md:mb-4 text-gray-900 dark:text-white">{t.home.steps.createProfile.title}</h3>
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 px-4">
                {t.home.steps.createProfile.description}
              </p>
            </div>

            <div className="text-center transform transition-all duration-300 hover:scale-105 min-w-[280px] md:min-w-0 flex-shrink-0">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-primary rounded-full flex items-center justify-center mb-4 md:mb-6 mx-auto text-xl md:text-2xl font-bold text-white shadow-lg hover:shadow-xl transition-shadow duration-300">
                2
              </div>
              <h3 className="text-lg md:text-2xl font-bold mb-2 md:mb-4 text-gray-900 dark:text-white">{t.home.steps.aiMatching.title}</h3>
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 px-4">
                {t.home.steps.aiMatching.description}
              </p>
            </div>

            <div className="text-center transform transition-all duration-300 hover:scale-105 min-w-[280px] md:min-w-0 flex-shrink-0">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-primary rounded-full flex items-center justify-center mb-4 md:mb-6 mx-auto text-xl md:text-2xl font-bold text-white shadow-lg hover:shadow-xl transition-shadow duration-300">
                3
              </div>
              <h3 className="text-lg md:text-2xl font-bold mb-2 md:mb-4 text-gray-900 dark:text-white">{t.home.steps.startChatting.title}</h3>
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 px-4">
                {t.home.steps.startChatting.description}
              </p>
            </div>

            {/* Duplicate set for seamless loop */}
            <div className="text-center transform transition-all duration-300 hover:scale-105 min-w-[280px] md:min-w-0 flex-shrink-0 md:hidden">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-primary rounded-full flex items-center justify-center mb-4 md:mb-6 mx-auto text-xl md:text-2xl font-bold text-white shadow-lg hover:shadow-xl transition-shadow duration-300">
                1
              </div>
              <h3 className="text-lg md:text-2xl font-bold mb-2 md:mb-4 text-gray-900 dark:text-white">{t.home.steps.createProfile.title}</h3>
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 px-4">
                {t.home.steps.createProfile.description}
              </p>
            </div>

            <div className="text-center transform transition-all duration-300 hover:scale-105 min-w-[280px] md:min-w-0 flex-shrink-0 md:hidden">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-primary rounded-full flex items-center justify-center mb-4 md:mb-6 mx-auto text-xl md:text-2xl font-bold text-white shadow-lg hover:shadow-xl transition-shadow duration-300">
                2
              </div>
              <h3 className="text-lg md:text-2xl font-bold mb-2 md:mb-4 text-gray-900 dark:text-white">{t.home.steps.aiMatching.title}</h3>
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 px-4">
                {t.home.steps.aiMatching.description}
              </p>
            </div>

            <div className="text-center transform transition-all duration-300 hover:scale-105 min-w-[280px] md:min-w-0 flex-shrink-0 md:hidden">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-primary rounded-full flex items-center justify-center mb-4 md:mb-6 mx-auto text-xl md:text-2xl font-bold text-white shadow-lg hover:shadow-xl transition-shadow duration-300">
                3
              </div>
              <h3 className="text-lg md:text-2xl font-bold mb-2 md:mb-4 text-gray-900 dark:text-white">{t.home.steps.startChatting.title}</h3>
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 px-4">
                {t.home.steps.startChatting.description}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-20 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/80" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="max-w-4xl mx-auto">
            <Sparkles className="h-10 w-10 md:h-12 md:w-12 text-white mx-auto mb-4 md:mb-6 animate-pulse" />
            <h2 className="text-2xl md:text-4xl font-bold mb-3 md:mb-6 text-white px-4">{t.home.readyToFind}</h2>
            <p className="text-base md:text-xl mb-6 md:mb-10 text-primary-foreground/90 max-w-3xl mx-auto px-4">
              {t.home.ctaDescription}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-6 justify-center px-4">
              <Link href="/auth/register" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto bg-white text-primary hover:bg-gray-100 px-6 md:px-8 py-3 md:py-4 rounded-lg text-base md:text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                  {t.home.startJourney}
                  <Rocket className="ml-2 md:ml-3 h-5 w-5 md:h-6 md:w-6" />
                </Button>
              </Link>
              <Link href="/algorithms" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto bg-transparent border-2 border-white text-white hover:bg-white hover:text-primary px-6 md:px-8 py-3 md:py-4 rounded-lg text-base md:text-lg transition-all duration-300">
                  {t.home.tryDemo}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 md:py-16 bg-gray-900 text-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 md:mb-8">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-primary rounded-lg flex items-center justify-center">
                <Heart className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
              <span className="text-xl md:text-2xl font-bold">
                {getBrandName()}
              </span>
            </div>
            <div className="flex flex-wrap justify-center gap-4 md:gap-8 text-xs md:text-sm">
              <Link href="/privacy" className="hover:text-primary transition-colors">{t.footer.privacy}</Link>
              <Link href="/terms" className="hover:text-primary transition-colors">{t.footer.terms}</Link>
              <Link href="/support" className="hover:text-primary transition-colors">{t.footer.support}</Link>
              <Link href="/about" className="hover:text-primary transition-colors">{t.footer.about}</Link>
            </div>
          </div>
          <div className="text-center text-xs md:text-sm text-gray-400">
            {t.footer.copyright}
            {isChinaDeployment() ? (
              <>
                <span className="mx-2">·</span>
                <span>粤ICP备2024281756号-21X</span>
              </>
            ) : null}
          </div>
        </div>
      </footer>
    </div>
  )
}

