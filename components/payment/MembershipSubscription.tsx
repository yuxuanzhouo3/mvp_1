'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';
import { getSupabaseClient } from '@/lib/supabase/client';
import {
  Crown,
  Star,
  Sparkles,
  Check,
  Zap,
  Shield,
  Eye,
  MapPin,
  Ghost,
  MessageSquare,
  Heart,
  Infinity,
  Gift,
  CreditCard,
  Wallet,
  Bitcoin,
  DollarSign,
} from 'lucide-react';

interface MembershipTier {
  id: string;
  name: string;
  nameEn: string;
  nameZh: string;
  monthlyPrice: number;
  monthlyPriceUsd: number;
  monthlyPriceCny: number;
  monthlyCredits: number;
  features: string[];
  benefits: {
    unlimitedLikes: boolean;
    canSeeWhoLikesMe: boolean;
    priorityMatching: boolean;
    invisibleMode: boolean;
    changeLocation: boolean;
    noAds: boolean;
    vipSupport: boolean;
  };
  isPopular?: boolean;
  isBestValue?: boolean;
}

interface CurrentMembership {
  tier: string;
  isActive: boolean;
  expiresAt?: string;
  daysRemaining?: number;
}

interface PaymentMethod {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  gradient: string;
}

export default function MembershipSubscription() {
  const { toast } = useToast();
  const router = useRouter();
  const { language } = useLanguage();
  const t = useTranslations(language);

  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [currentMembership, setCurrentMembership] = useState<CurrentMembership | null>(null);
  const [selectedTier, setSelectedTier] = useState<MembershipTier | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  const currencySymbol = language === 'zh' ? '¥' : '$';

  // Payment methods
  const paymentMethods: PaymentMethod[] = [
    {
      id: 'stripe',
      name: language === 'zh' ? '信用卡/借记卡' : 'Credit/Debit Card',
      icon: CreditCard,
      description: language === 'zh' ? 'Visa, Mastercard, 银联' : 'Visa, Mastercard, UnionPay',
      gradient: 'from-indigo-500 to-purple-500',
    },
    {
      id: 'paypal',
      name: 'PayPal',
      icon: Wallet,
      description: language === 'zh' ? 'PayPal 账户支付' : 'Pay with PayPal account',
      gradient: 'from-blue-600 to-blue-800',
    },
  ];

  // Fetch session token
  useEffect(() => {
    const getToken = async () => {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        setSessionToken(session.access_token);
      }
    };
    getToken();
  }, []);

  // Fetch tiers and current membership
  useEffect(() => {
    const fetchData = async () => {
      try {
        const currency = language === 'zh' ? 'CNY' : 'USD';

        // Fetch tiers
        const tiersResponse = await fetch(`/api/memberships/tiers?currency=${currency}`, {
          cache: 'no-store',
        });
        if (tiersResponse.ok) {
          const tiersData = await tiersResponse.json();
          setTiers(tiersData.data?.tiers || []);
        }

        // Fetch current membership status
        const statusResponse = await fetch('/api/memberships/status', {
          cache: 'no-store',
        });
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          setCurrentMembership(statusData.data?.membership || null);
        }
      } catch (error) {
        console.error('Error fetching membership data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [language]);

  const handleSubscribe = async () => {
    if (!selectedTier || selectedTier.id === 'free') {
      toast({
        title: t.membership.selectTier,
        variant: 'destructive',
      });
      return;
    }

    if (!selectedPaymentMethod) {
      toast({
        title: language === 'zh' ? '请选择支付方式' : 'Please select a payment method',
        variant: 'destructive',
      });
      return;
    }

    if (!sessionToken) {
      toast({
        title: t.membership.loginRequired,
        variant: 'destructive',
      });
      router.push('/auth/login');
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch('/api/memberships/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          tierId: selectedTier.id,
          paymentMethod: selectedPaymentMethod.id,
          currency: language === 'zh' ? 'CNY' : 'USD',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data?.checkoutUrl) {
          window.location.href = data.data.checkoutUrl;
        } else if (data.data?.approvalUrl) {
          window.location.href = data.data.approvalUrl;
        }
      } else {
        throw new Error('Subscription failed');
      }
    } catch (error) {
      toast({
        title: t.membership.subscribeFailed,
        description: t.membership.tryAgainLater,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getTierIcon = (tierId: string) => {
    switch (tierId) {
      case 'vip':
        return Crown;
      case 'premium':
        return Star;
      case 'basic':
        return Sparkles;
      default:
        return Gift;
    }
  };

  const getTierGradient = (tierId: string) => {
    switch (tierId) {
      case 'vip':
        return 'from-amber-500 to-orange-500';
      case 'premium':
        return 'from-purple-500 to-pink-500';
      case 'basic':
        return 'from-blue-500 to-cyan-500';
      default:
        return 'from-gray-400 to-gray-500';
    }
  };

  // 根据 benefits 对象生成本地化的功能列表
  const getLocalizedFeatures = (tier: MembershipTier): string[] => {
    const features: string[] = [];
    const benefits = tier.benefits;

    if (benefits.unlimitedLikes) features.push(t.membership.features.unlimitedLikes);
    if (tier.monthlyCredits > 0) features.push(`+${tier.monthlyCredits} ${t.membership.creditsPerMonth}`);
    if (benefits.noAds) features.push(t.membership.features.noAds);
    if (benefits.canSeeWhoLikesMe) features.push(t.membership.features.canSeeWhoLikesMe);
    if (benefits.priorityMatching) features.push(t.membership.features.priorityMatching);
    if (benefits.invisibleMode) features.push(t.membership.features.invisibleMode);
    if (benefits.changeLocation) features.push(t.membership.features.changeLocation);
    if (benefits.vipSupport) features.push(t.membership.features.vipSupport);

    return features;
  };

  const getBenefitIcon = (benefit: string) => {
    if (benefit.includes('Like') || benefit.includes('喜欢')) return Heart;
    if (benefit.includes('积分') || benefit.includes('credit')) return Gift;
    if (benefit.includes('广告') || benefit.includes('ads')) return Shield;
    if (benefit.includes('查看') || benefit.includes('See')) return Eye;
    if (benefit.includes('匹配') || benefit.includes('matching')) return Zap;
    if (benefit.includes('隐身') || benefit.includes('invisible')) return Ghost;
    if (benefit.includes('定位') || benefit.includes('location')) return MapPin;
    if (benefit.includes('客服') || benefit.includes('support')) return MessageSquare;
    if (benefit.includes('无限') || benefit.includes('unlimited')) return Infinity;
    return Check;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Membership Status */}
      {currentMembership && currentMembership.tier !== 'free' && (
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${getTierGradient(currentMembership.tier)}`}>
                  <Crown className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {t.membership.currentMembership}: {currentMembership.tier.toUpperCase()}
                  </p>
                  {currentMembership.daysRemaining !== undefined && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t.membership.daysRemaining.replace('{days}', String(currentMembership.daysRemaining))}
                    </p>
                  )}
                </div>
              </div>
              {currentMembership.isActive && (
                <Badge className="bg-green-500 text-white">
                  {t.membership.active}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Membership Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {tiers.filter(tier => tier.id !== 'free').map((tier) => {
          const Icon = getTierIcon(tier.id);
          const isSelected = selectedTier?.id === tier.id;
          const isCurrentTier = currentMembership?.tier === tier.id;

          return (
            <div
              key={tier.id}
              onClick={() => !isCurrentTier && setSelectedTier(tier)}
              className={`
                relative p-5 rounded-lg border-2 transition-all duration-200
                ${isCurrentTier
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20 cursor-default'
                  : isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 cursor-pointer'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800 cursor-pointer'
                }
              `}
            >
              {/* Badge */}
              {(tier.isPopular || tier.isBestValue) && (
                <div className="absolute -top-2 -right-2">
                  <Badge className={`bg-gradient-to-r ${getTierGradient(tier.id)} text-white border-0 text-xs`}>
                    {tier.isPopular && t.membership.popular}
                    {tier.isBestValue && t.membership.bestValue}
                  </Badge>
                </div>
              )}

              {isCurrentTier && (
                <div className="absolute -top-2 -left-2">
                  <Badge className="bg-green-500 text-white border-0 text-xs">
                    {t.membership.current}
                  </Badge>
                </div>
              )}

              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${getTierGradient(tier.id)}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                {isSelected && !isCurrentTier && (
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>

              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                {language === 'zh' ? tier.nameZh : tier.nameEn}
              </h3>

              <div className="flex items-baseline mb-3">
                <span className={`text-2xl font-extrabold bg-gradient-to-r ${getTierGradient(tier.id)} bg-clip-text text-transparent`}>
                  {currencySymbol}{language === 'zh' ? tier.monthlyPriceCny : tier.monthlyPriceUsd}
                </span>
                <span className="ml-1 text-sm text-gray-500 dark:text-gray-400">
                  /{t.membership.perMonth}
                </span>
              </div>

              {/* Monthly Credits */}
              {tier.monthlyCredits > 0 && (
                <div className="flex items-center mb-3 px-2 py-1 rounded bg-yellow-50 dark:bg-yellow-900/20">
                  <Gift className="h-4 w-4 mr-1 text-yellow-500" />
                  <span className="text-sm text-yellow-700 dark:text-yellow-300">
                    +{tier.monthlyCredits} {t.membership.creditsPerMonth}
                  </span>
                </div>
              )}

              {/* Benefits */}
              <ul className="space-y-2">
                {getLocalizedFeatures(tier).slice(0, 4).map((feature, index) => {
                  const BenefitIcon = getBenefitIcon(feature);
                  return (
                    <li key={index} className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <BenefitIcon className="h-4 w-4 mr-2 text-green-500 flex-shrink-0" />
                      <span className="line-clamp-1">{feature}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Subscribe Button */}
      {selectedTier && selectedTier.id !== currentMembership?.tier && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          {/* Payment Method Selection */}
          <div className="mb-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
              {language === 'zh' ? '选择支付方式' : 'Select Payment Method'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                const isSelected = selectedPaymentMethod?.id === method.id;
                return (
                  <button
                    key={method.id}
                    onClick={() => setSelectedPaymentMethod(method)}
                    className={`
                      p-4 rounded-lg border-2 transition-all duration-200 text-left
                      ${isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg bg-gradient-to-br ${method.gradient}`}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {method.name}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {method.description}
                          </p>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {t.membership.subscribeTo} {language === 'zh' ? selectedTier.nameZh : selectedTier.nameEn}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {currencySymbol}{language === 'zh' ? selectedTier.monthlyPriceCny : selectedTier.monthlyPriceUsd}/{t.membership.perMonth}
              </p>
            </div>
            <Button
              onClick={handleSubscribe}
              disabled={isProcessing}
              className="h-12 px-8 text-base font-semibold bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {t.membership.processing}
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  {t.membership.subscribeNow}
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
