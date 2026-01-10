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

  const faqItems: FAQItem[] = language === 'zh' ? [
    {
      question: '如何开始使用 PersonaLink？',
      answer: '注册账号后，完成个人资料设置，上传照片，然后系统会根据您的偏好为您推荐匹配对象。',
      category: 'getting-started',
    },
    {
      question: '积分是什么？如何获得积分？',
      answer: '积分是平台内的虚拟货币，用于解锁高级功能。您可以通过购买积分包、完成每日任务或邀请好友来获得积分。',
      category: 'credits',
    },
    {
      question: '如何提高匹配成功率？',
      answer: '完善您的个人资料、上传清晰的照片、诚实填写兴趣爱好，系统会根据这些信息为您推荐更合适的匹配对象。',
      category: 'matching',
    },
    {
      question: '我的隐私信息安全吗？',
      answer: '我们非常重视用户隐私。所有数据都经过加密存储，您可以在设置中控制哪些信息对其他用户可见。',
      category: 'privacy',
    },
    {
      question: '如何举报不当行为？',
      answer: '如果您遇到骚扰或不当行为，可以在聊天界面点击举报按钮，或联系客服团队。我们会认真处理每一条举报。',
      category: 'safety',
    },
    {
      question: '支持哪些支付方式？',
      answer: '我们支持信用卡/借记卡（通过 Stripe）、PayPal、支付宝和 USDT 等多种支付方式。',
      category: 'payment',
    },
    {
      question: '如何取消订阅或申请退款？',
      answer: '您可以在账户设置中管理订阅。关于退款，请联系客服团队，我们会根据具体情况处理。',
      category: 'payment',
    },
    {
      question: '如何联系客服？',
      answer: '您可以通过支持页面提交工单，或发送邮件至 support@personalink.com。我们通常会在24小时内回复。',
      category: 'support',
    },
  ] : [
    {
      question: 'How do I get started with PersonaLink?',
      answer: 'After registering, complete your profile setup, upload photos, and the system will recommend matches based on your preferences.',
      category: 'getting-started',
    },
    {
      question: 'What are credits and how do I get them?',
      answer: 'Credits are virtual currency used to unlock premium features. You can get credits by purchasing credit packages, completing daily tasks, or inviting friends.',
      category: 'credits',
    },
    {
      question: 'How can I improve my matching success rate?',
      answer: 'Complete your profile, upload clear photos, and honestly fill in your interests. The system will recommend better matches based on this information.',
      category: 'matching',
    },
    {
      question: 'Is my privacy information safe?',
      answer: 'We take privacy seriously. All data is encrypted, and you can control which information is visible to other users in your settings.',
      category: 'privacy',
    },
    {
      question: 'How do I report inappropriate behavior?',
      answer: 'If you encounter harassment or inappropriate behavior, click the report button in the chat interface or contact our support team. We take every report seriously.',
      category: 'safety',
    },
    {
      question: 'What payment methods are supported?',
      answer: 'We support Credit/Debit cards (via Stripe), PayPal, Alipay, and USDT cryptocurrency.',
      category: 'payment',
    },
    {
      question: 'How do I cancel my subscription or request a refund?',
      answer: 'You can manage your subscription in account settings. For refunds, please contact our support team and we will handle it case by case.',
      category: 'payment',
    },
    {
      question: 'How do I contact support?',
      answer: 'You can submit a ticket through the support page or email us at support@personalink.com. We typically respond within 24 hours.',
      category: 'support',
    },
  ];

  const categories = [
    { id: 'getting-started', icon: Zap, label: language === 'zh' ? '入门指南' : 'Getting Started', color: 'text-blue-500' },
    { id: 'credits', icon: CreditCard, label: language === 'zh' ? '积分与支付' : 'Credits & Payment', color: 'text-green-500' },
    { id: 'matching', icon: Heart, label: language === 'zh' ? '匹配功能' : 'Matching', color: 'text-red-500' },
    { id: 'privacy', icon: Shield, label: language === 'zh' ? '隐私安全' : 'Privacy & Security', color: 'text-purple-500' },
    { id: 'support', icon: MessageCircle, label: language === 'zh' ? '客户支持' : 'Customer Support', color: 'text-orange-500' },
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
          {language === 'zh' ? '帮助中心' : 'Help Center'}
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          {language === 'zh'
            ? '找到您需要的答案，了解如何充分利用 PersonaLink'
            : 'Find the answers you need and learn how to get the most out of PersonaLink'}
        </p>

        {/* Search */}
        <div className="relative max-w-xl mx-auto">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder={language === 'zh' ? '搜索常见问题...' : 'Search FAQs...'}
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
          {language === 'zh' ? '常见问题' : 'Frequently Asked Questions'}
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
