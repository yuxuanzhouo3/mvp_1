'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Copy, RefreshCw, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface PaymentMonitorProps {
  paymentId: string;
  paymentMethod: 'usdt' | 'alipay';
  amount: number;
  paymentAddress?: string;
  qrCodeUrl?: string;
  account?: string;
  network?: string;
  onPaymentVerified?: () => void;
}

interface PaymentData {
  status: string;
  metadata?: any;
}

export default function PaymentMonitor({
  paymentId,
  paymentMethod,
  amount,
  paymentAddress,
  qrCodeUrl,
  account,
  network,
  onPaymentVerified
}: PaymentMonitorProps) {
  const { toast } = useToast();
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [transactionHash, setTransactionHash] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [fromAddress, setFromAddress] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    checkPaymentStatus();
    // Poll for payment status every 30 seconds
    const interval = setInterval(checkPaymentStatus, 30000);
    return () => clearInterval(interval);
  }, [paymentId]);

  const checkPaymentStatus = async () => {
    try {
      const response = await fetch(`/api/payments/status/${paymentId}`);
      if (response.ok) {
        const data = await response.json();
        setPaymentData(data);
        
        if (data.status === 'completed' && onPaymentVerified) {
          onPaymentVerified();
        }
      }
    } catch (error) {
      console.error('Failed to check payment status:', error);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: '已复制',
        description: `${label} 已复制到剪贴板`,
      });
    } catch (error) {
      toast({
        title: '复制失败',
        description: '请手动复制',
        variant: 'destructive',
      });
    }
  };

  const handleManualVerification = async () => {
    if (!transactionHash && !transactionId) {
      toast({
        title: '验证失败',
        description: '请输入交易哈希或交易ID',
        variant: 'destructive',
      });
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch('/api/payments/verify-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId,
          paymentMethod,
          transactionHash,
          transactionId,
          amount,
          fromAddress,
        }),
      });

      if (response.ok) {
        toast({
          title: '验证成功',
          description: '支付已验证，积分已添加到您的账户',
        });
        checkPaymentStatus();
        if (onPaymentVerified) {
          onPaymentVerified();
        }
      } else {
        const error = await response.json();
        toast({
          title: '验证失败',
          description: error.error || '请检查输入信息是否正确',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: '验证失败',
        description: '网络错误，请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'pending':
      case 'processing':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '支付成功';
      case 'pending':
        return '等待支付';
      case 'processing':
        return '处理中';
      case 'failed':
        return '支付失败';
      default:
        return '未知状态';
    }
  };

  if (paymentData?.status === 'completed') {
    return (
      <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
        <CardContent className="p-6">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div>
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                支付成功！
              </h3>
              <p className="text-green-600 dark:text-green-300">
                您的积分已添加到账户
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payment Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {getStatusIcon(paymentData?.status || 'pending')}
            <span>支付状态: {getStatusText(paymentData?.status || 'pending')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={checkPaymentStatus}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              刷新状态
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payment Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>支付说明</CardTitle>
          <CardDescription>
            请按照以下步骤完成支付
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {paymentMethod === 'usdt' && paymentAddress && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">支付地址 ({network})</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Input
                    value={paymentAddress}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(paymentAddress, '支付地址')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                  重要提示：
                </h4>
                <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                  <li>• 请确保使用 {network} 网络发送 USDT</li>
                  <li>• 发送金额必须为 {amount} USDT</li>
                  <li>• 建议在备注中填写支付ID: {paymentId}</li>
                  <li>• 支付确认可能需要 1-3 分钟</li>
                </ul>
              </div>
            </div>
          )}

          {paymentMethod === 'alipay' && qrCodeUrl && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">支付宝收款码</Label>
                <div className="mt-2">
                  <img
                    src={qrCodeUrl}
                    alt="Alipay QR Code"
                    className="border rounded-lg"
                    style={{ maxWidth: '200px' }}
                  />
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium">收款账户</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Input
                    value={account || ''}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(account || '', '收款账户')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                  支付说明：
                </h4>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• 使用支付宝扫描上方二维码</li>
                  <li>• 支付金额: {amount} 元</li>
                  <li>• 请在备注中填写支付ID: {paymentId}</li>
                  <li>• 支付成功后积分将自动到账</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Verification */}
      <Card>
        <CardHeader>
          <CardTitle>手动验证支付</CardTitle>
          <CardDescription>
            如果您已完成支付但状态未更新，可以手动验证
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {paymentMethod === 'usdt' && (
            <>
              <div>
                <Label htmlFor="transactionHash">交易哈希</Label>
                <Input
                  id="transactionHash"
                  value={transactionHash}
                  onChange={(e) => setTransactionHash(e.target.value)}
                  placeholder="输入USDT交易哈希"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="fromAddress">发送地址</Label>
                <Input
                  id="fromAddress"
                  value={fromAddress}
                  onChange={(e) => setFromAddress(e.target.value)}
                  placeholder="输入您的USDT发送地址"
                  className="mt-1"
                />
              </div>
            </>
          )}

          {paymentMethod === 'alipay' && (
            <div>
              <Label htmlFor="transactionId">交易ID</Label>
              <Input
                id="transactionId"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="输入支付宝交易ID"
                className="mt-1"
              />
            </div>
          )}

          <Button
            onClick={handleManualVerification}
            disabled={isVerifying}
            className="w-full"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                验证中...
              </>
            ) : (
              '验证支付'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
} 