'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  HelpCircle,
  MessageCircle,
  CreditCard,
  Shield,
  Users,
  Settings,
  Mail,
  ChevronDown,
  ChevronUp,
  Search,
  Zap,
  Heart,
} from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';
import { useState, useEffect } from 'react';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

export default function HelpPage() {
  const [mounted, setMounted] = useState(false);
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { language } = useLanguage();
  const t = useTranslations(language);

  useEffect(() => {
    setMounted(true);
  }, []);

  const faqItems = t.helpPage.faq as readonly FAQItem[];

  const categories = [
    { id: 'getting-started', icon: Zap, label: t.helpPage.categories.gettingStarted, color: 'text-blue-500' },
    { id: 'credits', icon: CreditCard, label: t.helpPage.categories.credits, color: 'text-green-500' },
    { id: 'matching', icon: Heart, label: t.helpPage.categories.matching, color: 'text-red-500' },
    { id: 'privacy', icon: Shield, label: t.helpPage.categories.privacy, color: 'text-purple-500' },
    { id: 'support', icon: MessageCircle, label: t.helpPage.categories.support, color: 'text-orange-500' },
  ];

  const filteredFAQs = faqItems.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!mounted) {
    return <div className="min-h-screen bg-white dark:bg-gray-950" suppressHydrationWarning />;
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-6">
          <HelpCircle className="h-8 w-8 text-blue-600" />
        </div>
        <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
          {t.helpPage.title}
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          {t.helpPage.description}
        </p>

        {/* Search */}
        <div className="relative max-w-xl mx-auto">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder={t.helpPage.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <button
              key={category.id}
              onClick={() => {
                const element = document.getElementById(`faq-${category.id}`);
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-center"
            >
              <Icon className={`h-6 w-6 mx-auto mb-2 ${category.color}`} />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {category.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* FAQ Section */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
          {t.helpPage.faqTitle}
        </h2>
        <div className="space-y-4">
          {filteredFAQs.map((faq, index) => (
            <div
              key={index}
              id={`faq-${faq.category}`}
              className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
            >
              <button
                onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
                className="w-full px-6 py-4 flex items-center justify-between bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="font-medium text-left text-gray-900 dark:text-white">
                  {faq.question}
                </span>
                {openFAQ === index ? (
                  <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
                )}
              </button>
              {openFAQ === index && (
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-gray-600 dark:text-gray-400">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredFAQs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              {language === 'zh' ? '未找到相关问题' : 'No matching questions found'}
            </p>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <CardTitle className="text-lg">
                {language === 'zh' ? '新手指南' : 'Getting Started Guide'}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {language === 'zh'
                ? '了解如何创建个人资料并开始匹配'
                : 'Learn how to set up your profile and start matching'}
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/about">
                {language === 'zh' ? '了解更多' : 'Learn More'}
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CreditCard className="h-5 w-5 text-green-600" />
              </div>
              <CardTitle className="text-lg">
                {language === 'zh' ? '积分充值' : 'Buy Credits'}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {language === 'zh'
                ? '购买积分解锁更多功能'
                : 'Purchase credits to unlock more features'}
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/payment/recharge">
                {language === 'zh' ? '立即充值' : 'Recharge Now'}
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Mail className="h-5 w-5 text-purple-600" />
              </div>
              <CardTitle className="text-lg">
                {language === 'zh' ? '联系我们' : 'Contact Us'}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {language === 'zh'
                ? '有其他问题？联系我们的支持团队'
                : "Have other questions? Contact our support team"}
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/support">
                {language === 'zh' ? '获取支持' : 'Get Support'}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Contact CTA */}
      <div className="text-center bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-8">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          {language === 'zh' ? '还有其他问题吗？' : 'Still have questions?'}
        </h2>
        <p className="text-muted-foreground mb-6">
          {language === 'zh'
            ? '我们的支持团队随时为您提供帮助'
            : 'Our support team is here to help you'}
        </p>
        <div className="flex justify-center gap-4">
          <Button asChild>
            <Link href="/support">
              <MessageCircle className="h-4 w-4 mr-2" />
              {language === 'zh' ? '联系支持' : 'Contact Support'}
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/contact">
              <Mail className="h-4 w-4 mr-2" />
              {language === 'zh' ? '发送邮件' : 'Send Email'}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
