'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers/AuthProvider';
import { useLanguage } from '@/components/language-provider';
import { getSupabaseClient } from '@/lib/supabase/client';
import { isChinaDeployment } from '@/lib/config/deployment.config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Receipt,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';

const TRANSLATIONS = {
  zh: {
    title: '我的订单',
    subtitle: '查看和管理您的支付订单',
    noOrders: '暂无订单记录',
    noOrdersDesc: '您还没有任何支付订单',
    goRecharge: '去充值',
    orderNumber: '订单号',
    amount: '金额',
    credits: '积分',
    paymentMethod: '支付方式',
    status: '状态',
    createdAt: '创建时间',
    actions: '操作',
    cancel: '取消',
    refresh: '刷新',
    back: '返回',
    statusPending: '待支付',
    statusProcessing: '处理中',
    statusCompleted: '已完成',
    statusFailed: '失败',
    statusRefunded: '已退款',
    statusCancelled: '已取消',
    cancelConfirmTitle: '确认取消订单',
    cancelConfirmDesc: '您确定要取消这个订单吗？此操作无法撤销。',
    cancelButton: '确认取消',
    cancelSuccess: '订单已取消',
    cancelError: '取消订单失败',
    loading: '加载中...',
    stripe: '信用卡/借记卡',
    paypal: 'PayPal',
    alipay: '支付宝',
    usdt: 'USDT',
  },
  en: {
    title: 'My Orders',
    subtitle: 'View and manage your payment orders',
    noOrders: 'No orders yet',
    noOrdersDesc: 'You have not made any payment orders yet',
    goRecharge: 'Recharge Now',
    orderNumber: 'Order ID',
    amount: 'Amount',
    credits: 'Credits',
    paymentMethod: 'Payment Method',
    status: 'Status',
    createdAt: 'Created At',
    actions: 'Actions',
    cancel: 'Cancel',
    refresh: 'Refresh',
    back: 'Back',
    statusPending: 'Pending',
    statusProcessing: 'Processing',
    statusCompleted: 'Completed',
    statusFailed: 'Failed',
    statusRefunded: 'Refunded',
    statusCancelled: 'Cancelled',
    cancelConfirmTitle: 'Cancel Order',
    cancelConfirmDesc: 'Are you sure you want to cancel this order? This action cannot be undone.',
    cancelButton: 'Confirm Cancel',
    cancelSuccess: 'Order cancelled successfully',
    cancelError: 'Failed to cancel order',
    loading: 'Loading...',
    stripe: 'Credit/Debit Card',
    paypal: 'PayPal',
    alipay: 'Alipay',
    usdt: 'USDT',
  },
};

interface Payment {
  id: string;
  amount: number;
  currency: string;
  credits: number;
  payment_method: string;
  status: string;
  created_at: string;
  metadata?: {
    packageId?: string;
    description?: string;
  };
}

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = TRANSLATIONS[language] || TRANSLATIONS.zh;
  const supabase = getSupabaseClient();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);

  const fetchPayments = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      let token: string | null = null;
      const isCN = isChinaDeployment();
      
      if (isCN) {
        // CN 环境：使用 cn_ 前缀的 token
        token = `cn_${user.id}`;
      } else {
        // INTL 环境：使用 Supabase session token
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token || null;
      }

      if (!token) {
        console.error('No session token');
        return;
      }

      const response = await fetch('/api/payments/history?limit=50', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        cache: 'no-store',
        credentials: 'include', // 确保发送 cookie
      });

      if (response.ok) {
        const data = await response.json();
        setPayments(data.payments || []);
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchPayments();
    } else if (!authLoading && !user) {
      router.push('/auth/login');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const handleCancelClick = (paymentId: string) => {
    setSelectedPaymentId(paymentId);
    setShowCancelDialog(true);
  };

  const handleCancelConfirm = async () => {
    if (!selectedPaymentId || !user) return;

    try {
      setCancellingId(selectedPaymentId);
      
      let token: string | null = null;
      const isCN = isChinaDeployment();
      
      if (isCN) {
        // CN 环境：使用 cn_ 前缀的 token
        token = `cn_${user.id}`;
      } else {
        // INTL 环境：使用 Supabase session token
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token || null;
      }

      const response = await fetch('/api/payments/cancel', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentId: selectedPaymentId }),
        cache: 'no-store',
        credentials: 'include', // 确保发送 cookie
      });

      if (response.ok) {
        toast({
          title: t.cancelSuccess,
          variant: 'default',
        });
        // Optimistically update the local state immediately
        setPayments(prevPayments =>
          prevPayments.map(payment =>
            payment.id === selectedPaymentId
              ? { ...payment, status: 'cancelled' }
              : payment
          )
        );
        // Then refresh from server to ensure consistency
        fetchPayments();
      } else {
        const error = await response.json();
        toast({
          title: t.cancelError,
          description: error.message || error.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: t.cancelError,
        variant: 'destructive',
      });
    } finally {
      setCancellingId(null);
      setShowCancelDialog(false);
      setSelectedPaymentId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1" />{t.statusPending}</Badge>;
      case 'processing':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><RefreshCw className="w-3 h-3 mr-1 animate-spin" />{t.statusProcessing}</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />{t.statusCompleted}</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1" />{t.statusFailed}</Badge>;
      case 'refunded':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200"><RefreshCw className="w-3 h-3 mr-1" />{t.statusRefunded}</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200"><XCircle className="w-3 h-3 mr-1" />{t.statusCancelled}</Badge>;
      default:
        return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" />{status}</Badge>;
    }
  };

  const getPaymentMethodName = (method: string) => {
    switch (method) {
      case 'stripe':
        return t.stripe;
      case 'paypal':
        return t.paypal;
      case 'alipay':
        return t.alipay;
      case 'usdt':
        return t.usdt;
      default:
        return method;
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    if (currency === 'CNY') {
      return `¥${amount.toFixed(2)}`;
    }
    return `$${amount.toFixed(2)}`;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t.back}
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Receipt className="w-6 h-6" />
              {t.title}
            </h1>
            <p className="text-gray-600">{t.subtitle}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchPayments}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          {t.refresh}
        </Button>
      </div>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          {payments.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t.noOrders}</h3>
              <p className="text-gray-500 mb-4">{t.noOrdersDesc}</p>
              <Button onClick={() => router.push('/payment/recharge')}>
                {t.goRecharge}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.orderNumber}</TableHead>
                  <TableHead>{t.amount}</TableHead>
                  <TableHead>{t.credits}</TableHead>
                  <TableHead>{t.paymentMethod}</TableHead>
                  <TableHead>{t.status}</TableHead>
                  <TableHead>{t.createdAt}</TableHead>
                  <TableHead className="text-right">{t.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono text-sm">
                      {payment.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      {formatAmount(payment.amount, payment.currency)}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-blue-600">
                        {payment.credits}
                      </span>
                    </TableCell>
                    <TableCell>
                      {getPaymentMethodName(payment.payment_method)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(payment.status)}
                    </TableCell>
                    <TableCell>
                      {new Date(payment.created_at).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US')}
                    </TableCell>
                    <TableCell className="text-right">
                      {payment.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleCancelClick(payment.id)}
                          disabled={cancellingId === payment.id}
                        >
                          {cancellingId === payment.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            t.cancel
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.cancelConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.cancelConfirmDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{language === 'zh' ? '返回' : 'Go Back'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              {t.cancelButton}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
