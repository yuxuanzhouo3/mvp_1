'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  CreditCard, 
  DollarSign, 
  Bitcoin, 
  Gift,
  Check,
  Star,
  Zap,
  Crown,
  ArrowLeft
} from 'lucide-react';
import PaymentMonitor from './PaymentMonitor';

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  originalPrice?: number;
  popular?: boolean;
  bestValue?: boolean;
  features: string[];
}

interface PaymentMethod {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  processingTime: string;
}

interface PaymentData {
  paymentId: string;
  paymentAddress?: string;
  qrCodeUrl?: string;
  account?: string;
  network?: string;
  amount: number;
  paymentMethod: string;
}

const creditPackages: CreditPackage[] = [
  {
    id: 'starter',
    name: '入门包',
    credits: 50,
    price: 9.99,
    features: ['50 积分', '基础匹配', '标准客服'],
  },
  {
    id: 'popular',
    name: '热门包',
    credits: 150,
    price: 24.99,
    originalPrice: 29.99,
    popular: true,
    features: ['150 积分', '优先匹配', '优先客服', '高级筛选'],
  },
  {
    id: 'premium',
    name: '高级包',
    credits: 300,
    price: 44.99,
    originalPrice: 59.99,
    bestValue: true,
    features: ['300 积分', '超级匹配', '专属客服', '无限筛选', '数据分析'],
  },
  {
    id: 'ultimate',
    name: '终极包',
    credits: 500,
    price: 69.99,
    originalPrice: 99.99,
    features: ['500 积分', 'VIP 匹配', '24/7 客服', '所有功能', '专属活动'],
  },
];

const paymentMethods: PaymentMethod[] = [
  {
    id: 'stripe',
    name: '信用卡/借记卡',
    icon: CreditCard,
    description: 'Visa, Mastercard, American Express',
    processingTime: '即时到账',
  },
  {
    id: 'usdt',
    name: 'USDT 支付',
    icon: Bitcoin,
    description: 'TRC20 网络',
    processingTime: '1-3 分钟',
  },
  {
    id: 'alipay',
    name: '支付宝',
    icon: DollarSign,
    description: '支付宝扫码支付',
    processingTime: '即时到账',
  },
];

export default function CreditRecharge() {
  const { toast } = useToast();
  const router = useRouter();
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [showPaymentMonitor, setShowPaymentMonitor] = useState(false);

  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };

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
        title: '请选择套餐和支付方式',
        description: '请先选择积分套餐和支付方式',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: selectedPackage.id,
          paymentMethod: selectedPaymentMethod.id,
          amount: selectedPackage.price,
          credits: selectedPackage.credits,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        if (selectedPaymentMethod.id === 'stripe') {
          // Redirect to Stripe checkout
          if (typeof window !== 'undefined') {
            window.location.href = data.checkoutUrl;
          }
        } else if (selectedPaymentMethod.id === 'usdt') {
          // Show USDT payment monitor
          setPaymentData({
            paymentId: data.paymentId,
            paymentAddress: data.paymentAddress,
            amount: data.amount,
            network: data.network,
            paymentMethod: 'usdt',
          });
          setShowPaymentMonitor(true);
        } else if (selectedPaymentMethod.id === 'alipay') {
          // Show Alipay payment monitor
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
        throw new Error('支付创建失败');
      }
    } catch (error) {
      toast({
        title: '支付失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentVerified = () => {
    toast({
      title: '支付成功！',
      description: '积分已添加到您的账户',
    });
    router.push('/dashboard');
  };

  const getPackageIcon = (pkg: CreditPackage) => {
    if (pkg.bestValue) return Crown;
    if (pkg.popular) return Star;
    return Gift;
  };

  // If payment monitor is shown, display it
  if (showPaymentMonitor && paymentData) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
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
            <span>返回选择</span>
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Back Button */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={handleBackToDashboard}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>返回仪表板</span>
        </Button>
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          积分充值
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          选择适合您的积分套餐，开始您的匹配之旅
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Credit Packages */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            选择套餐
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {creditPackages.map((pkg) => {
              const Icon = getPackageIcon(pkg);
              const isSelected = selectedPackage?.id === pkg.id;
              
              return (
                <Card 
                  key={pkg.id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    isSelected 
                      ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'hover:border-gray-300'
                  }`}
                  onClick={() => handlePackageSelect(pkg)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Icon className="h-5 w-5 text-blue-600" />
                        <CardTitle className="text-lg">{pkg.name}</CardTitle>
                      </div>
                      {isSelected && (
                        <Check className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                    
                    {pkg.popular && (
                      <Badge className="w-fit bg-orange-100 text-orange-800">
                        热门
                      </Badge>
                    )}
                    {pkg.bestValue && (
                      <Badge className="w-fit bg-purple-100 text-purple-800">
                        最超值
                      </Badge>
                    )}
                  </CardHeader>
                  
                  <CardContent>
                    <div className="text-center mb-4">
                      <div className="text-3xl font-bold text-gray-900 dark:text-white">
                        {pkg.credits}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        积分
                      </div>
                    </div>
                    
                    <div className="text-center mb-4">
                      <div className="flex items-center justify-center space-x-2">
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">
                          ¥{pkg.price}
                        </span>
                        {pkg.originalPrice && (
                          <span className="text-sm text-gray-500 line-through">
                            ¥{pkg.originalPrice}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        一次性付款
                      </div>
                    </div>
                    
                    <ul className="space-y-2">
                      {pkg.features.map((feature, index) => (
                        <li key={index} className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Payment Method Selection */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            选择支付方式
          </h2>
          
          <div className="space-y-4">
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              const isSelected = selectedPaymentMethod?.id === method.id;
              
              return (
                <Card 
                  key={method.id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    isSelected 
                      ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'hover:border-gray-300'
                  }`}
                  onClick={() => handlePaymentMethodSelect(method)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-3">
                          <Icon className="h-6 w-6 text-gray-600" />
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              {method.name}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {method.description}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            处理时间
                          </div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {method.processingTime}
                          </div>
                        </div>
                        {isSelected && (
                          <Check className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Purchase Summary */}
          {selectedPackage && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>购买摘要</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">套餐</span>
                  <span className="font-medium">{selectedPackage.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">积分</span>
                  <span className="font-medium">{selectedPackage.credits} 积分</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">支付方式</span>
                  <span className="font-medium">
                    {selectedPaymentMethod?.name || '未选择'}
                  </span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium">总计</span>
                    <span className="text-2xl font-bold text-blue-600">
                      ¥{selectedPackage.price}
                    </span>
                  </div>
                </div>
                
                <Button 
                  onClick={handlePurchase}
                  disabled={!selectedPaymentMethod || isProcessing}
                  className="w-full"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      处理中...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      立即购买
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Features */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">
          为什么选择我们的积分系统？
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">即时到账</h3>
            <p className="text-gray-600 dark:text-gray-400">
              支付成功后积分立即到账，无需等待
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">安全可靠</h3>
            <p className="text-gray-600 dark:text-gray-400">
              多种支付方式，安全加密保护
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Gift className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">灵活选择</h3>
            <p className="text-gray-600 dark:text-gray-400">
              多种套餐选择，满足不同需求
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 