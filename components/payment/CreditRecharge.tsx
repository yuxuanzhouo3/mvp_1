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
  CreditCard,
  DollarSign,
  Bitcoin,
  Gift,
  Check,
  Zap,
  Crown,
  ArrowLeft,
  Sparkles,
  Shield,
  TrendingUp,
  Gem,
  Rocket,
  Lock,
  Wallet,
  Coins,
  Star
} from 'lucide-react';
import PaymentMonitor from './PaymentMonitor';
import { PayPalCheckout } from './PayPalButton';
import MembershipSubscription from './MembershipSubscription';

// Tab types
type TabType = 'credits' | 'membership';

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  originalPrice?: number;
  popular?: boolean;
  bestValue?: boolean;
  gradient: string;
  iconBg: string;
  features: string[];
}

interface PaymentMethod {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  processingTime: string;
  gradient: string;
}

interface PaymentData {
  paymentId: string;
  paymentAddress?: string;
  qrCodeUrl?: string;
  account?: string;
  network?: string;
  amount: number;
  paymentMethod: string;
  // PayPal specific fields
  orderId?: string;
  credits?: number;
}

// Base package prices - USD and CNY are independently priced, not converted
const basePackages = [
  {
    id: 'starter',
    credits: 50,
    usdPrice: 1.39,
    cnyPrice: 9.99,
    usdOriginalPrice: undefined as number | undefined,
    cnyOriginalPrice: undefined as number | undefined,
    discount: undefined as string | undefined,
    bonus: undefined as string | undefined,
  },
  {
    id: 'popular',
    credits: 150,
    usdPrice: 3.49,
    cnyPrice: 24.99,
    usdOriginalPrice: 4.36,  // ~20% off
    cnyOriginalPrice: 31.24,
    discount: '20% OFF',
    bonus: 'boost_1',  // 送 1 次 Boost
  },
  {
    id: 'premium',
    credits: 300,
    usdPrice: 6.29,
    cnyPrice: 44.99,
    usdOriginalPrice: 8.39,  // ~25% off
    cnyOriginalPrice: 59.99,
    discount: '25% OFF',
    bonus: 'premium_3days',  // 送 3 天 Premium 体验
  },
  {
    id: 'ultimate',
    credits: 500,
    usdPrice: 9.79,
    cnyPrice: 69.99,
    usdOriginalPrice: 13.99,  // ~30% off
    cnyOriginalPrice: 99.99,
    discount: '30% OFF',
    bonus: 'vip_7days',  // 送 7 天 VIP 体验
  },
];

// Get credit packages based on language
const getPackages = (t: any, language: string): CreditPackage[] => {
  const isCn = language === 'zh';

  return basePackages.map((pkg, index) => {
    const price = isCn ? pkg.cnyPrice : pkg.usdPrice;
    const originalPrice = isCn ? pkg.cnyOriginalPrice : pkg.usdOriginalPrice;

    // Build features list dynamically based on package
    const baseFeatures: string[] = [];

    if (pkg.id === 'starter') {
      baseFeatures.push(
        t.payment.recharge.packages.starter.feature1,
        t.payment.recharge.packages.starter.feature2,
        t.payment.recharge.packages.starter.feature3,
      );
    } else if (pkg.id === 'popular') {
      baseFeatures.push(
        t.payment.recharge.packages.popular.feature1,
        t.payment.recharge.packages.popular.feature2,
        t.payment.recharge.packages.popular.feature3,
        t.payment.recharge.packages.popular.feature4,
      );
    } else if (pkg.id === 'premium') {
      baseFeatures.push(
        t.payment.recharge.packages.premium.feature1,
        t.payment.recharge.packages.premium.feature2,
        t.payment.recharge.packages.premium.feature3,
        t.payment.recharge.packages.premium.feature4,
        t.payment.recharge.packages.premium.feature5,
      );
    } else if (pkg.id === 'ultimate') {
      baseFeatures.push(
        t.payment.recharge.packages.ultimate.feature1,
        t.payment.recharge.packages.ultimate.feature2,
        t.payment.recharge.packages.ultimate.feature3,
        t.payment.recharge.packages.ultimate.feature4,
        t.payment.recharge.packages.ultimate.feature5,
      );
    }

    // Add bonus feature if available
    if (pkg.bonus) {
      const bonusText = pkg.bonus === 'boost_1'
        ? (isCn ? '🎁 送 1 次 Boost' : '🎁 +1 Free Boost')
        : pkg.bonus === 'premium_3days'
        ? (isCn ? '🎁 送 3 天 Premium 体验' : '🎁 +3 Days Premium Trial')
        : pkg.bonus === 'vip_7days'
        ? (isCn ? '🎁 送 7 天 VIP 体验' : '🎁 +7 Days VIP Trial')
        : '';
      if (bonusText) baseFeatures.push(bonusText);
    }

    const gradients = [
      'from-gray-500 to-gray-700',
      'from-blue-500 to-cyan-500',
      'from-purple-500 to-pink-500',
      'from-amber-500 to-orange-500',
    ];

    const iconBgs = [
      'bg-gray-100 dark:bg-gray-800',
      'bg-blue-100 dark:bg-blue-900/30',
      'bg-purple-100 dark:bg-purple-900/30',
      'bg-amber-100 dark:bg-amber-900/30',
    ];

    return {
      id: pkg.id,
      name: t.payment.recharge.packages[pkg.id as keyof typeof t.payment.recharge.packages].name,
      credits: pkg.credits,
      price: price,
      originalPrice: originalPrice,
      popular: pkg.id === 'popular',
      bestValue: pkg.id === 'premium',
      gradient: gradients[index],
      iconBg: iconBgs[index],
      features: baseFeatures,
    };
  });
};

const getPaymentMethods = (t: any): PaymentMethod[] => [
  {
    id: 'stripe',
    name: t.payment.recharge.paymentMethods.stripe.name,
    icon: CreditCard,
    description: t.payment.recharge.paymentMethods.stripe.description,
    processingTime: t.payment.recharge.paymentMethods.stripe.processingTime,
    gradient: 'from-indigo-500 to-purple-500',
  },
  {
    id: 'paypal',
    name: t.payment.recharge.paymentMethods.paypal?.name || 'PayPal',
    icon: Wallet,
    description: t.payment.recharge.paymentMethods.paypal?.description || 'PayPal, Credit/Debit Card',
    processingTime: t.payment.recharge.paymentMethods.paypal?.processingTime || 'Instant',
    gradient: 'from-blue-600 to-blue-800',
  },
  {
    id: 'usdt',
    name: t.payment.recharge.paymentMethods.usdt.name,
    icon: Bitcoin,
    description: t.payment.recharge.paymentMethods.usdt.description,
    processingTime: t.payment.recharge.paymentMethods.usdt.processingTime,
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    id: 'alipay',
    name: t.payment.recharge.paymentMethods.alipay.name,
    icon: DollarSign,
    description: t.payment.recharge.paymentMethods.alipay.description,
    processingTime: t.payment.recharge.paymentMethods.alipay.processingTime,
    gradient: 'from-blue-500 to-blue-600',
  },
];

export default function CreditRecharge() {
  const { toast } = useToast();
  const router = useRouter();
  const { language } = useLanguage();
  const t = useTranslations(language);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('credits');

  // Get localized data
  const creditPackages = getPackages(t, language);
  const paymentMethods = getPaymentMethods(t);

  // Currency symbol
  const currencySymbol = t.currency.symbol;

  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [showPaymentMonitor, setShowPaymentMonitor] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  // Get session token on mount
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

  const handlePackageSelect = (pkg: CreditPackage) => {
    setSelectedPackage(pkg);
    setPaymentData(null);
    setShowPaymentMonitor(false);
  };

  const handlePaymentMethodSelect = (method: PaymentMethod) => {
    setSelectedPaymentMethod(method);
    setPaymentData(null);
    setShowPaymentMonitor(false);
  };

  const handlePurchase = async () => {
    if (!selectedPackage || !selectedPaymentMethod) {
      toast({
        title: t.payment.recharge.errors.selectPackageAndMethod,
        description: t.payment.recharge.errors.selectPackageAndMethodDesc,
        variant: 'destructive',
      });
      return;
    }

    if (!sessionToken) {
      toast({
        title: language === 'zh' ? '未登录' : 'Not logged in',
        description: language === 'zh' ? '请先登录后再进行支付' : 'Please login before making a payment',
        variant: 'destructive',
      });
      router.push('/auth/login');
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          packageId: selectedPackage.id,
          paymentMethod: selectedPaymentMethod.id,
          amount: selectedPackage.price,
          credits: selectedPackage.credits,
        }),
        cache: 'no-store',
      });

      if (response.ok) {
        const data = await response.json();

        if (selectedPaymentMethod.id === 'stripe') {
          if (typeof window !== 'undefined') {
            window.location.href = data.checkoutUrl;
          }
        } else if (selectedPaymentMethod.id === 'paypal') {
          setPaymentData({
            paymentId: data.paymentId,
            orderId: data.orderId,
            amount: data.amount,
            credits: data.credits,
            paymentMethod: 'paypal',
          });
          setShowPaymentMonitor(true);
        } else if (selectedPaymentMethod.id === 'usdt') {
          setPaymentData({
            paymentId: data.paymentId,
            paymentAddress: data.paymentAddress,
            amount: data.amount,
            network: data.network,
            paymentMethod: 'usdt',
          });
          setShowPaymentMonitor(true);
        } else if (selectedPaymentMethod.id === 'alipay') {
          setPaymentData({
            paymentId: data.paymentId,
            qrCodeUrl: data.qrCodeUrl,
            account: data.account,
            amount: data.amount,
            paymentMethod: 'alipay',
          });
          setShowPaymentMonitor(true);
        }
      } else {
        throw new Error(t.payment.recharge.errors.paymentCreationFailed);
      }
    } catch (error) {
      toast({
        title: t.payment.recharge.errors.paymentFailed,
        description: t.payment.recharge.errors.paymentFailedDesc,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentVerified = () => {
    toast({
      title: t.payment.recharge.paymentSuccess,
      description: t.payment.recharge.creditsAdded,
    });
    router.push('/dashboard');
  };

  // If payment monitor is shown, display it
  if (showPaymentMonitor && paymentData) {
    // PayPal has its own checkout flow
    if (paymentData.paymentMethod === 'paypal' && paymentData.orderId) {
      return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => {
                setShowPaymentMonitor(false);
                setPaymentData(null);
              }}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{t.payment.recharge.backToSelection}</span>
            </Button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {'Complete PayPal Payment'}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {'Click the PayPal button below to complete your purchase'}
              </p>
            </div>

            <PayPalCheckout
              paymentData={{
                orderId: paymentData.orderId,
                paymentId: paymentData.paymentId,
                amount: paymentData.amount,
                credits: paymentData.credits || 0,
              }}
              onSuccess={handlePaymentVerified}
              onError={(error) => {
                toast({
                  title: t.payment.recharge.errors.paymentFailed,
                  description: error.message || t.payment.recharge.errors.paymentFailedDesc,
                  variant: 'destructive',
                });
              }}
              onCancel={() => {
                setShowPaymentMonitor(false);
                setPaymentData(null);
              }}
            />
          </div>
        </div>
      );
    }

    // USDT/Alipay payment monitor
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => {
              setShowPaymentMonitor(false);
              setPaymentData(null);
            }}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t.payment.recharge.backToSelection}</span>
          </Button>
        </div>

        <PaymentMonitor
          paymentId={paymentData.paymentId}
          paymentMethod={paymentData.paymentMethod as 'usdt' | 'alipay'}
          amount={paymentData.amount}
          paymentAddress={paymentData.paymentAddress}
          qrCodeUrl={paymentData.qrCodeUrl}
          account={paymentData.account}
          network={paymentData.network}
          onPaymentVerified={handlePaymentVerified}
        />
      </div>
    );
  }

  const getPackageIcon = (pkg: CreditPackage) => {
    if (pkg.bestValue) return Crown;
    if (pkg.popular) return Gem;
    return Gift;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Page Header */}
      <div className="mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                <CreditCard className="h-6 w-6 mr-2 text-blue-600" />
                {t.payment.recharge.title}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {t.payment.recharge.description}
              </p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex space-x-2 mt-6 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <button
              onClick={() => setActiveTab('credits')}
              className={`flex-1 flex items-center justify-center py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                activeTab === 'credits'
                  ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Coins className="h-4 w-4 mr-2" />
              {language === 'zh' ? '积分充值' : 'Buy Credits'}
            </button>
            <button
              onClick={() => setActiveTab('membership')}
              className={`flex-1 flex items-center justify-center py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                activeTab === 'membership'
                  ? 'bg-white dark:bg-gray-800 text-purple-600 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Crown className="h-4 w-4 mr-2" />
              {language === 'zh' ? '会员订阅' : 'Membership'}
            </button>
          </div>

          {/* Stats badges - only show for credits tab */}
          {activeTab === 'credits' && (
            <div className="flex flex-wrap items-center gap-4 mt-4">
              <div className="flex items-center px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30">
                <Rocket className="h-4 w-4 mr-2 text-blue-500" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{t.payment.recharge.instantDelivery}</span>
              </div>
              <div className="flex items-center px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-900/30">
                <Shield className="h-4 w-4 mr-2 text-green-500" />
                <span className="text-sm font-medium text-green-700 dark:text-green-300">{t.payment.recharge.securePayment}</span>
              </div>
              <div className="flex items-center px-3 py-1.5 rounded-full bg-purple-50 dark:bg-purple-900/30">
                <Sparkles className="h-4 w-4 mr-2 text-purple-500" />
                <span className="text-sm font-medium text-purple-700 dark:text-purple-300">{t.payment.recharge.bestValueBadge}</span>
              </div>
            </div>
          )}

          {/* Stats badges for membership tab */}
          {activeTab === 'membership' && (
            <div className="flex flex-wrap items-center gap-4 mt-4">
              <div className="flex items-center px-3 py-1.5 rounded-full bg-purple-50 dark:bg-purple-900/30">
                <Star className="h-4 w-4 mr-2 text-purple-500" />
                <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                  {language === 'zh' ? '解锁全部功能' : 'Unlock All Features'}
                </span>
              </div>
              <div className="flex items-center px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/30">
                <Gift className="h-4 w-4 mr-2 text-amber-500" />
                <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                  {language === 'zh' ? '每月赠送积分' : 'Monthly Credits Bonus'}
                </span>
              </div>
              <div className="flex items-center px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-900/30">
                <Shield className="h-4 w-4 mr-2 text-green-500" />
                <span className="text-sm font-medium text-green-700 dark:text-green-300">
                  {language === 'zh' ? '随时取消' : 'Cancel Anytime'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Membership Tab Content */}
      {activeTab === 'membership' && (
        <MembershipSubscription />
      )}

      {/* Credits Tab Content */}
      {activeTab === 'credits' && (
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Credit Packages */}
        <div className="xl:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t.payment.recharge.selectPackage}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {creditPackages.map((pkg) => {
                const Icon = getPackageIcon(pkg);
                const isSelected = selectedPackage?.id === pkg.id;

                return (
                  <div
                    key={pkg.id}
                    onClick={() => handlePackageSelect(pkg)}
                    className={`
                      relative p-5 rounded-lg border-2 cursor-pointer transition-all duration-200
                      ${isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                      }
                    `}
                  >
                    {/* Popular/Best Value Badge */}
                    {(pkg.popular || pkg.bestValue) && (
                      <div className="absolute -top-2 -right-2">
                        <Badge className={`bg-gradient-to-r ${pkg.gradient} text-white border-0 text-xs`}>
                          {pkg.popular && t.payment.recharge.popular}
                          {pkg.bestValue && t.payment.recharge.bestValue}
                        </Badge>
                      </div>
                    )}

                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${pkg.gradient}`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                      {pkg.name}
                    </h3>

                    <div className="flex items-baseline mb-3">
                      <span className={`text-3xl font-extrabold bg-gradient-to-r ${pkg.gradient} bg-clip-text text-transparent`}>
                        {pkg.credits}
                      </span>
                      <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                        {t.payment.recharge.credits}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 mb-4">
                      <span className="text-xl font-bold text-gray-900 dark:text-white">
                        {currencySymbol}{pkg.price}
                      </span>
                      {pkg.originalPrice && (
                        <>
                          <span className="text-sm text-gray-400 line-through">
                            {currencySymbol}{pkg.originalPrice}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            -{Math.round((1 - pkg.price / pkg.originalPrice!) * 100)}%
                          </Badge>
                        </>
                      )}
                    </div>

                    <ul className="space-y-2">
                      {pkg.features.slice(0, 3).map((feature, index) => (
                        <li key={index} className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <Check className="h-4 w-4 mr-2 text-green-500 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Payment Methods */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <CreditCard className="h-5 w-5 mr-2 text-blue-600" />
              {t.payment.recharge.selectPaymentMethod}
            </h2>

            <div className="space-y-3">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                const isSelected = selectedPaymentMethod?.id === method.id;

                return (
                  <button
                    key={method.id}
                    onClick={() => handlePaymentMethodSelect(method)}
                    className={`
                      w-full p-4 rounded-lg border-2 transition-all duration-200 text-left
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
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {method.name}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {method.processingTime}
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

            {/* Security Notice */}
            <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <div className="flex items-start">
                <Shield className="h-4 w-4 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                <div className="text-xs">
                  <p className="font-medium text-blue-900 dark:text-blue-300">
                    {t.payment.recharge.securePaymentTitle}
                  </p>
                  <p className="text-blue-700 dark:text-blue-400 mt-0.5">
                    {t.payment.recharge.securePaymentDesc}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          {selectedPackage && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                {t.payment.recharge.purchaseSummary}
              </h2>

              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">{t.payment.recharge.package}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{selectedPackage.name}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">{t.payment.recharge.credits}</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {selectedPackage.credits}
                  </span>
                </div>

                <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">{t.payment.recharge.paymentMethod}</span>
                  <span className={`font-medium ${selectedPaymentMethod ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                    {selectedPaymentMethod?.name || t.payment.recharge.notSelected}
                  </span>
                </div>

                <div className="pt-3">
                  <div className="flex justify-between items-center p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {t.payment.recharge.total}
                    </span>
                    <span className="text-2xl font-bold text-blue-600">
                      {currencySymbol}{selectedPackage.price}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={handlePurchase}
                  disabled={!selectedPaymentMethod || isProcessing}
                  className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white mt-4"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {t.payment.recharge.processing}
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      {t.payment.recharge.purchaseNow}
                    </>
                  )}
                </Button>

                <div className="flex items-center justify-center space-x-4 pt-2">
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                    <Shield className="h-3 w-3 mr-1 text-green-500" />
                    <span>{t.payment.recharge.secure}</span>
                  </div>
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                    <Zap className="h-3 w-3 mr-1 text-blue-500" />
                    <span>{t.payment.recharge.instant}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Why Choose Section - only show for credits tab */}
      {activeTab === 'credits' && (
        <div className="mt-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {t.payment.recharge.whyChooseTitle}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {t.payment.recharge.selectPlan}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 mb-3">
                  <Zap className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  {t.payment.recharge.features.instant.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t.payment.recharge.features.instant.description}
                </p>
              </div>

              <div className="text-center p-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 mb-3">
                  <Shield className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  {t.payment.recharge.features.secure.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t.payment.recharge.features.secure.description}
                </p>
              </div>

              <div className="text-center p-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 mb-3">
                  <Gift className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  {t.payment.recharge.features.flexible.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t.payment.recharge.features.flexible.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
