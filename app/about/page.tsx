'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Heart,
  Users,
  Shield,
  Zap,
  Globe,
  Award,
  Target,
  Lightbulb,
  ArrowRight
} from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';
import { useState, useEffect } from 'react';

export default function AboutPage() {
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
    <div className="max-w-6xl mx-auto py-12 px-4">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          {t.about.title}
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
          {t.about.heroDescription}
        </p>
        <div className="flex justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/auth/register">
              {t.about.getStarted}
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/contact">
              {t.about.contactUs}
            </Link>
          </Button>
        </div>
      </div>

      {/* Mission Section */}
      <div className="mb-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-6">{t.about.mission.title}</h2>
            <p className="text-lg text-muted-foreground mb-6">
              {t.about.mission.paragraph1}
            </p>
            <p className="text-lg text-muted-foreground mb-6">
              {t.about.mission.paragraph2}
            </p>
            <div className="flex items-center gap-2 text-blue-600 font-medium">
              <Target className="h-5 w-5" />
              <span>{t.about.mission.tagline}</span>
            </div>
          </div>
          <div className="relative">
            <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl p-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-4 text-center">
                  <Heart className="h-8 w-8 text-red-500 mx-auto mb-2" />
                  <p className="font-semibold">10K+</p>
                  <p className="text-sm text-muted-foreground">{t.about.stats.happyUsers}</p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center">
                  <Users className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                  <p className="font-semibold">50K+</p>
                  <p className="text-sm text-muted-foreground">{t.about.stats.connectionsMade}</p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center">
                  <Globe className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="font-semibold">25+</p>
                  <p className="text-sm text-muted-foreground">{t.about.stats.countries}</p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center">
                  <Award className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                  <p className="font-semibold">95%</p>
                  <p className="text-sm text-muted-foreground">{t.about.stats.successRate}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-center mb-12">{t.about.features.whyChoose}</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle>{t.about.features.aiMatching.title}</CardTitle>
              <CardDescription>
                {t.about.features.aiMatching.description}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>{t.about.features.safeSecure.title}</CardTitle>
              <CardDescription>
                {t.about.features.safeSecure.description}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <Heart className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle>{t.about.features.meaningfulConnections.title}</CardTitle>
              <CardDescription>
                {t.about.features.meaningfulConnections.description}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* How It Works */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-center mb-12">{t.about.howItWorks.title}</h2>
        <div className="grid md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-600">1</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">{t.about.howItWorks.createProfile.title}</h3>
            <p className="text-muted-foreground">
              {t.about.howItWorks.createProfile.description}
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-green-600">2</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">{t.about.howItWorks.getMatched.title}</h3>
            <p className="text-muted-foreground">
              {t.about.howItWorks.getMatched.description}
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-purple-600">3</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">{t.about.howItWorks.startChatting.title}</h3>
            <p className="text-muted-foreground">
              {t.about.howItWorks.startChatting.description}
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-orange-600">4</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">{t.about.howItWorks.buildFriendship.title}</h3>
            <p className="text-muted-foreground">
              {t.about.howItWorks.buildFriendship.description}
            </p>
          </div>
        </div>
      </div>

      {/* Team Section */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-center mb-12">{t.about.team.title}</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="text-center">
            <CardHeader>
              <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">JD</span>
              </div>
              <CardTitle>{t.about.team.john.name}</CardTitle>
              <CardDescription>{t.about.team.john.role}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {t.about.team.john.description}
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">JS</span>
              </div>
              <CardTitle>{t.about.team.jane.name}</CardTitle>
              <CardDescription>{t.about.team.jane.role}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {t.about.team.jane.description}
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-24 h-24 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">MJ</span>
              </div>
              <CardTitle>{t.about.team.mike.name}</CardTitle>
              <CardDescription>{t.about.team.mike.role}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {t.about.team.mike.description}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Values Section */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-center mb-12">{t.about.values.title}</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Lightbulb className="h-6 w-6 text-yellow-500" />
                <CardTitle>{t.about.values.innovation.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {t.about.values.innovation.description}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-green-500" />
                <CardTitle>{t.about.values.privacy.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {t.about.values.privacy.description}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Heart className="h-6 w-6 text-red-500" />
                <CardTitle>{t.about.values.authenticity.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {t.about.values.authenticity.description}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Users className="h-6 w-6 text-blue-500" />
                <CardTitle>{t.about.values.community.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {t.about.values.community.description}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="text-center bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-12">
        <h2 className="text-3xl font-bold mb-4">{t.about.cta.title}</h2>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          {t.about.cta.description}
        </p>
        <div className="flex justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/auth/register">
              {t.about.cta.getStartedFree}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/contact">
              {t.about.cta.learnMore}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
