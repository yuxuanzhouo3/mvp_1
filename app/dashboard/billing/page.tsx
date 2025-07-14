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

interface BillingRecord {
  id: string;
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed';
  payment_method: string;
  description: string;
  created_at: string;
  invoice_url?: string;
}

export default function BillingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentBalance, setCurrentBalance] = useState(0);

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    loadBillingData();
  }, [user]);

  const loadBillingData = async () => {
    try {
      setIsLoading(true);
      
      // Load billing records
      const response = await fetch('/api/user/billing');
      if (response.ok) {
        const data = await response.json();
        setBillingRecords(data.records);
        setCurrentBalance(data.balance || 0);
      }
    } catch (error) {
      toast({
        title: '加载失败',
        description: '无法加载账单信息',
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
      const response = await fetch(`/api/user/billing/${recordId}/invoice`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${recordId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      toast({
        title: '下载失败',
        description: '无法下载发票',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">已完成</Badge>;
      case 'pending':
        return <Badge variant="secondary">处理中</Badge>;
      case 'failed':
        return <Badge variant="destructive">失败</Badge>;
      default:
        return <Badge variant="outline">未知</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
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
          <p className="text-gray-600 dark:text-gray-400">加载账单信息中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              账单管理
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              查看您的充值记录和账单信息
            </p>
          </div>
          <Link href="/dashboard">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回仪表盘
            </Button>
          </Link>
        </div>

        {/* Balance Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              当前余额
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  ¥{currentBalance.toFixed(2)}
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  可用于匹配和聊天
                </p>
              </div>
              <Button onClick={handleRecharge}>
                <Plus className="h-4 w-4 mr-2" />
                充值
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Billing Records */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="h-5 w-5 mr-2" />
              充值记录
            </CardTitle>
          </CardHeader>
          <CardContent>
            {billingRecords.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  暂无充值记录
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  开始您的第一次充值吧！
                </p>
                <Button onClick={handleRecharge}>
                  立即充值
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {billingRecords.map((record) => (
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
                            <span>支付方式: {record.payment_method}</span>
                            <span>时间: {formatDate(record.created_at)}</span>
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
                      
                      {record.status === 'completed' && record.invoice_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadInvoice(record.id)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          发票
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 