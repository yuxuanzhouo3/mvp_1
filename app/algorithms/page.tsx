/**
 * 匹配算法介绍页面
 * 展示四种匹配算法的详细说明和可视化
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';
import {
  Gem,
  Rocket,
  Target,
  Gift,
  CheckCircle,
  TrendingUp,
  Users,
  Heart,
  Star,
  Sparkles,
  Scale,
  Zap,
  ChevronRight,
  Play,
  ArrowLeft,
} from 'lucide-react';

// ========================================
// 类型定义
// ========================================

interface Algorithm {
  id: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  successRate: string;
}

// ========================================
// 算法数据
// ========================================

const getAlgorithms = (): Algorithm[] => [
  {
    id: 'compatible',
    icon: <Gem className="w-8 h-8" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    successRate: '85%',
  },
  {
    id: 'romantic',
    icon: <Rocket className="w-8 h-8" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    successRate: '65%',
  },
  {
    id: 'pragmatic',
    icon: <Target className="w-8 h-8" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    successRate: '92%',
  },
  {
    id: 'serendipity',
    icon: <Gift className="w-8 h-8" />,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
    successRate: '55%',
  }
];

// ========================================
// 算法卡片组件
// ========================================

interface AlgorithmCardProps {
  algorithm: Algorithm;
  isSelected: boolean;
  onSelect: () => void;
  t: any;
}

function AlgorithmCard({ algorithm, isSelected, onSelect, t }: AlgorithmCardProps) {
  const algoData = t.algorithmsPage[algorithm.id];

  return (
    <Card
      className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
        isSelected
          ? `${algorithm.borderColor} border-2 shadow-lg`
          : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl ${algorithm.bgColor} ${algorithm.color}`}>
            {algorithm.icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={`text-xl font-bold ${algorithm.color}`}>
                {algoData.name}
              </h3>
              <Badge variant="outline" className={algorithm.color}>
                {algoData.shortDesc}
              </Badge>
            </div>
            <p className="text-gray-600 text-sm line-clamp-2">
              {algoData.description}
            </p>
            <div className="flex items-center gap-4 mt-3 text-sm">
              <span className="flex items-center gap-1 text-gray-500">
                <Users className="w-4 h-4" />
                {algoData.persona}
              </span>
              <span className="flex items-center gap-1 text-green-600">
                <TrendingUp className="w-4 h-4" />
                {t.algorithmsPage.successRateLabel} {algorithm.successRate}
              </span>
            </div>
          </div>
          {isSelected && (
            <CheckCircle className={`w-6 h-6 ${algorithm.color}`} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ========================================
// 算法详情组件
// ========================================

interface AlgorithmDetailProps {
  algorithm: Algorithm;
  t: any;
}

function AlgorithmDetail({ algorithm, t }: AlgorithmDetailProps) {
  const algoData = t.algorithmsPage[algorithm.id];

  return (
    <div className="space-y-8">
      {/* 头部 */}
      <div className={`p-8 rounded-2xl ${algorithm.bgColor} border ${algorithm.borderColor}`}>
        <div className="flex items-center gap-4 mb-4">
          <div className={`p-4 rounded-xl bg-white shadow-sm ${algorithm.color}`}>
            {algorithm.icon}
          </div>
          <div>
            <h2 className={`text-3xl font-bold ${algorithm.color}`}>
              {algoData.name}
            </h2>
            <p className="text-gray-600">{algoData.shortDesc}</p>
          </div>
        </div>
        <p className="text-gray-700 text-lg leading-relaxed">
          {algoData.description}
        </p>
      </div>

      {/* 特点和适合人群 */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              {t.algorithmsPage.features}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {algoData.features.map((feature: string, idx: number) => (
                <li key={idx} className="flex items-center gap-3">
                  <CheckCircle className={`w-5 h-5 ${algorithm.color}`} />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              {t.algorithmsPage.bestFor}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {algoData.bestFor.map((item: string, idx: number) => (
                <li key={idx} className="flex items-center gap-3">
                  <Heart className={`w-5 h-5 ${algorithm.color}`} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* 匹配逻辑 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-500" />
            {t.algorithmsPage.matchingLogic}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-6">{algoData.matchingLogic}</p>

          {/* 示例 */}
          <div className={`p-6 rounded-xl ${algorithm.bgColor} border ${algorithm.borderColor}`}>
            <h4 className="font-semibold mb-4 flex items-center gap-2">
              <Scale className="w-5 h-5" />
              {t.algorithmsPage.matchingExample}
            </h4>
            <div className="grid md:grid-cols-3 gap-4 text-center">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-sm text-gray-500 mb-1">
                  {t.algorithmsPage.yourScore}
                </div>
                <div className={`text-2xl font-bold ${algorithm.color}`}>
                  78.5
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-sm text-gray-500 mb-1">
                  {t.algorithmsPage.recommendedRange}
                </div>
                <div className={`text-2xl font-bold ${algorithm.color}`}>
                  {algoData.matchRange}
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-sm text-gray-500 mb-1">
                  {t.algorithmsPage.estimatedSuccess}
                </div>
                <div className={`text-2xl font-bold text-green-600`}>
                  {algorithm.successRate}
                </div>
              </div>
            </div>
            <p className="text-gray-600 text-sm mt-4 text-center">
              {algoData.exampleExplanation}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ========================================
// 主页面组件
// ========================================

export default function AlgorithmsPage() {
  const { language } = useLanguage();
  const t = useTranslations(language);

  const algorithms = getAlgorithms();
  const [selectedAlgorithm, setSelectedAlgorithm] = useState(algorithms[0]);

  return (
    <div className="min-h-screen bg-background">
      {/* 返回首页按钮 */}
      <div className="bg-background/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link href="/">
            <Button variant="ghost" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              {t.algorithmsPage.backToHome}
            </Button>
          </Link>
        </div>
      </div>

      {/* 头部 */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary to-primary/70 text-white py-16">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-14 -left-16 h-72 w-72 rounded-full bg-white/15 blur-3xl motion-safe:animate-blob motion-reduce:animate-none" />
          <div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-white/10 blur-3xl motion-safe:animate-blob motion-safe:animation-delay-2000 motion-reduce:animate-none" />
          <div className="absolute top-1/3 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl motion-safe:animate-blob motion-safe:animation-delay-4000 motion-reduce:animate-none" />
        </div>
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center relative z-10 motion-safe:fade-in motion-reduce:animate-none">
            <Badge className="bg-white/20 text-white mb-4">
              {t.algorithmsPage.badge}
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {t.algorithmsPage.title}
            </h1>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              {t.algorithmsPage.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* 核心卖点 */}
      <div className="max-w-6xl mx-auto px-4 -mt-8">
        <div className="grid md:grid-cols-4 gap-4">
          {[
            { icon: <Star className="w-6 h-6" />, label: t.algorithmsPage.highlights.scoring, value: t.algorithmsPage.highlights.scoringValue },
            { icon: <Users className="w-6 h-6" />, label: t.algorithmsPage.highlights.quality, value: t.algorithmsPage.highlights.qualityValue },
            { icon: <Heart className="w-6 h-6" />, label: t.algorithmsPage.highlights.success, value: t.algorithmsPage.highlights.successValue },
            { icon: <Zap className="w-6 h-6" />, label: t.algorithmsPage.highlights.smart, value: t.algorithmsPage.highlights.smartValue },
          ].map((item, idx) => (
            <Card key={idx} className="bg-card/90 backdrop-blur shadow-lg border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  {item.icon}
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">{item.label}</div>
                  <div className="font-bold text-foreground">{item.value}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 算法选择 */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {t.algorithmsPage.selectMode}
          </h2>
          <p className="text-muted-foreground">
            {t.algorithmsPage.clickToSee}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {algorithms.map(algo => (
            <AlgorithmCard
              key={algo.id}
              algorithm={algo}
              isSelected={selectedAlgorithm.id === algo.id}
              onSelect={() => setSelectedAlgorithm(algo)}
              t={t}
            />
          ))}
        </div>

        {/* 算法详情 */}
        <AlgorithmDetail algorithm={selectedAlgorithm} t={t} />
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-r from-primary to-primary/70 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            {t.algorithmsPage.ctaTitle}
          </h2>
          <p className="text-white/90 mb-8">
            {t.algorithmsPage.ctaSubtitle}
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/matching">
              <Button size="lg" className="bg-white text-red-500 hover:bg-gray-100">
                <Play className="w-5 h-5 mr-2" />
                {t.algorithmsPage.startMatching}
              </Button>
            </Link>
            <Link href="/profile/setup">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                {t.algorithmsPage.completeProfile}
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
