'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';

interface PaymentStatusProps {
  paymentId: string;
  onStatusChange?: (status: string) => void;
}

interface PaymentData {
  id: string;
  status: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

const TRANSLATIONS = {
  zh: {
    fetchFailed: '获取支付状态失败',
    tryLater: '请稍后重试',
    loading: '加载支付状态...',
    noPaymentInfo: '无法获取支付信息',
    paymentStatus: '支付状态',
    refresh: '刷新',
    completed: '支付成功',
    failed: '支付失败',
    pending: '等待支付',
    processing: '处理中',
    unknown: '未知状态',
    amount: '金额:',
    paymentMethod: '支付方式:',
    createdAt: '创建时间:',
    updatedAt: '更新时间:',
    pendingHint: '请完成支付流程。如果支付已完成但状态未更新，请点击刷新按钮。',
    failedHint: '支付失败，请重新尝试或联系客服。',
    completedHint: '支付成功！积分已添加到您的账户。',
  },
  en: {
    fetchFailed: 'Failed to fetch payment status',
    tryLater: 'Please try again later',
    loading: 'Loading payment status...',
    noPaymentInfo: 'Unable to get payment information',
    paymentStatus: 'Payment Status',
    refresh: 'Refresh',
    completed: 'Payment Successful',
    failed: 'Payment Failed',
    pending: 'Pending Payment',
    processing: 'Processing',
    unknown: 'Unknown Status',
    amount: 'Amount:',
    paymentMethod: 'Payment Method:',
    createdAt: 'Created At:',
    updatedAt: 'Updated At:',
    pendingHint: 'Please complete the payment process. If payment is completed but status not updated, click refresh.',
    failedHint: 'Payment failed. Please try again or contact support.',
    completedHint: 'Payment successful! Credits have been added to your account.',
  },
};

export default function PaymentStatus({ paymentId, onStatusChange }: PaymentStatusProps) {
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = TRANSLATIONS[language] || TRANSLATIONS.zh;
  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    checkPaymentStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId]);

  const checkPaymentStatus = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/payments/status/${paymentId}`, { cache: 'no-store' });
      
      if (response.ok) {
        const data = await response.json();
        setPayment(data);
        onStatusChange?.(data.status);
      } else {
        throw new Error('Failed to fetch payment status');
      }
    } catch (error) {
      toast({
        title: t.fetchFailed,
        description: t.tryLater,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await checkPaymentStatus();
    setIsRefreshing(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'pending':
      case 'processing':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'pending':
      case 'processing':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return t.completed;
      case 'failed':
        return t.failed;
      case 'pending':
        return t.pending;
      case 'processing':
        return t.processing;
      default:
        return t.unknown;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
            <span>{t.loading}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!payment) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            {t.noPaymentInfo}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{t.paymentStatus}</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {t.refresh}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-3">
          {getStatusIcon(payment.status)}
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <Badge className={getStatusColor(payment.status)}>
                {getStatusText(payment.status)}
              </Badge>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {payment.description}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">{t.amount}</span>
            <span className="ml-2 font-medium">
              {payment.currency} {payment.amount}
            </span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">{t.paymentMethod}</span>
            <span className="ml-2 font-medium">{payment.paymentMethod}</span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">{t.createdAt}</span>
            <span className="ml-2 font-medium">
              {new Date(payment.createdAt).toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">{t.updatedAt}</span>
            <span className="ml-2 font-medium">
              {new Date(payment.updatedAt).toLocaleString()}
            </span>
          </div>
        </div>

        {payment.status === 'pending' && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              {t.pendingHint}
            </p>
          </div>
        )}

        {payment.status === 'failed' && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
            <p className="text-sm text-red-800 dark:text-red-200">
              {t.failedHint}
            </p>
          </div>
        )}

        {payment.status === 'completed' && (
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
            <p className="text-sm text-green-800 dark:text-green-200">
              {t.completedHint}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 