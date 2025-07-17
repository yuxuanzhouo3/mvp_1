'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';

export default function PaymentCancelPage() {
  const router = useRouter();

  const handleRetryPayment = () => {
    router.push('/payment/recharge');
  };

  const handleGoToDashboard = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card className="text-center">
          <CardHeader className="pb-4">
            <div className="mx-auto mb-4 w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              支付已取消
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              您的支付已被取消，积分未添加到账户
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
              <p className="text-sm text-red-700 dark:text-red-300">
                如果您在支付过程中遇到问题，请稍后重试或联系客服
              </p>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={handleRetryPayment}
                className="w-full"
                size="lg"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                重新支付
              </Button>
              
              <Button 
                onClick={handleGoToDashboard}
                variant="outline"
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回仪表板
              </Button>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400">
              <p>需要帮助？请联系客服</p>
              <p>客服邮箱: support@personalink.com</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 