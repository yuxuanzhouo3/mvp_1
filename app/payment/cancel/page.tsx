'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';

export default function PaymentCancelPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const t = useTranslations(language);

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
              {t.payment.cancel.title}
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              {t.payment.cancel.description}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
              <p className="text-sm text-red-700 dark:text-red-300">
                {t.payment.cancel.message}
              </p>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={handleRetryPayment}
                className="w-full"
                size="lg"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {t.payment.cancel.retryPayment}
              </Button>
              
              <Button 
                onClick={handleGoToDashboard}
                variant="outline"
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t.payment.cancel.returnToDashboard}
              </Button>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400">
              <p>{t.payment.cancel.needHelp}</p>
              <p>{t.payment.cancel.supportEmail}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 