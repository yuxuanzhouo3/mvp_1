'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  CreditCard, 
  DollarSign, 
  Calendar, 
  Download,
  ArrowLeft,
  Plus
} from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';

interface BillingRecord {
  id: string;
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed';
  payment_method?: string;
  paymentMethod?: string;
  description: string;
  created_at?: string;
  createdAt?: string;
  invoice_url?: string;
  invoiceUrl?: string;
}

export default function BillingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = useTranslations(language);

  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentBalance, setCurrentBalance] = useState(0);

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    loadBillingData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadBillingData = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/user/billing', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        setBillingRecords(Array.isArray(data.records) ? data.records : []);
        setCurrentBalance(data.balance || 0);
      }
    } catch (error) {
      toast({
        title: t.dashboardBilling.loadFailed,
        description: t.dashboardBilling.loadFailedDesc,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecharge = () => {
    router.push('/payment/recharge');
  };

  const downloadInvoice = async (recordId: string) => {
    try {
      if (typeof window === 'undefined') {
        return;
      }

      const response = await fetch(`/api/user/billing/${recordId}/invoice`, { cache: 'no-store' });
      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        const fallbackType = response.headers.get('x-invoice-fallback') || '';

        if (contentType.includes('application/json')) {
          const payload = await response.json();
          if (payload?.url && typeof payload.url === 'string') {
            window.open(payload.url, '_blank', 'noopener,noreferrer');
            return;
          }
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fallbackType === 'html'
          ? `invoice-${recordId}.html`
          : `invoice-${recordId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      toast({
        title: t.dashboardBilling.downloadFailed,
        description: t.dashboardBilling.downloadFailedDesc,
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">{t.dashboardBilling.statusCompleted}</Badge>;
      case 'pending':
        return <Badge variant="secondary">{t.dashboardBilling.statusPending}</Badge>;
      case 'failed':
        return <Badge variant="destructive">{t.dashboardBilling.statusFailed}</Badge>;
      default:
        return <Badge variant="outline">{t.dashboardBilling.statusUnknown}</Badge>;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) {
      return '-';
    }
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return date.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{t.dashboardBilling.downloading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t.dashboardBilling.title}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {t.dashboardBilling.subtitle}
            </p>
          </div>
          <Link href="/dashboard">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t.dashboardBilling.backToDashboard}
            </Button>
          </Link>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              {t.dashboardBilling.currentBalance}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  ¥{currentBalance.toFixed(2)}
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  {t.dashboardBilling.availableForUse}
                </p>
              </div>
              <Button onClick={handleRecharge}>
                <Plus className="h-4 w-4 mr-2" />
                {t.dashboardBilling.recharge}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="h-5 w-5 mr-2" />
              {t.dashboardBilling.rechargeRecords}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {billingRecords.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {t.dashboardBilling.noRecords}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {t.dashboardBilling.startFirstRecharge}
                </p>
                <Button onClick={handleRecharge}>
                  {t.dashboardBilling.rechargeNow}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {billingRecords.map((record) => {
                  const paymentMethod = record.paymentMethod || record.payment_method || '-';
                  const createdAt = record.createdAt || record.created_at;
                  const invoiceUrl = record.invoiceUrl || record.invoice_url;

                  return (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <CreditCard className="h-8 w-8 text-blue-600" />
                      </div>
                      
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {record.description}
                          </h4>
                          {getStatusBadge(record.status)}
                        </div>
                        
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center space-x-4">
                            <span>{t.dashboardBilling.paymentMethod}: {paymentMethod}</span>
                            <span>{t.dashboardBilling.time}: {formatDate(createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900 dark:text-white">
                          ¥{record.amount.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {record.currency}
                        </div>
                      </div>
                      
                      {record.status === 'completed' && invoiceUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadInvoice(record.id)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          {t.dashboardBilling.invoice}
                        </Button>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 
