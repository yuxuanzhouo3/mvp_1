'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, ArrowRight, CreditCard, Home } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';

interface PaymentSuccessData {
  credits: number;
  amount: number;
  paymentMethod: string;
  transactionId: string;
}

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = useTranslations(language);
  const [paymentData, setPaymentData] = useState<PaymentSuccessData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      verifyPayment(sessionId);
    } else {
      setIsLoading(false);
    }
  }, [sessionId]);

  const verifyPayment = async (sessionId: string) => {
    try {
      const response = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
        cache: 'no-store',
      });

      if (response.ok) {
        const data = await response.json();
        setPaymentData(data);
      } else {
        toast({
          title: t.payment.success.verificationFailed,
          description: t.payment.success.verificationFailedDesc,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: t.payment.success.verificationError,
        description: t.payment.success.verificationErrorDesc,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToDashboard = () => {
    router.push('/dashboard');
  };

  const handleGoToMatching = () => {
    router.push('/matching');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t.payment.success.verifyingPayment}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card className="text-center">
          <CardHeader className="pb-4">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              {t.payment.success.title}
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              {t.payment.success.description}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {paymentData ? (
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <CreditCard className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-green-800 dark:text-green-200">
                      {t.payment.success.creditsAdded.replace('{credits}', String(paymentData.credits))}
                    </span>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {t.payment.success.addedToAccount}
                  </p>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{t.payment.success.paymentAmount}</span>
                    <span className="font-medium">¥{paymentData.amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{t.payment.success.paymentMethod}</span>
                    <span className="font-medium">{paymentData.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{t.payment.success.transactionId}</span>
                    <span className="font-mono text-xs">{paymentData.transactionId.slice(0, 8)}...</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {t.payment.success.paymentComplete}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <Button
                onClick={handleGoToMatching}
                className="w-full"
                size="lg"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                {t.payment.success.startMatching}
              </Button>

              <Button
                onClick={handleGoToDashboard}
                variant="outline"
                className="w-full"
              >
                <Home className="h-4 w-4 mr-2" />
                {t.payment.success.returnToDashboard}
              </Button>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400">
              <p>{t.payment.success.anyQuestions}</p>
              <p>{t.payment.success.supportEmail}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
} 