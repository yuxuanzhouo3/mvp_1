'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Copy, RefreshCw, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';

const TRANSLATIONS = {
  zh: {
    copied: '已复制',
    copiedDesc: (label: string) => `${label} 已复制到剪贴板`,
    copyFailed: '复制失败',
    copyManually: '请手动复制',
    verifyFailed: '验证失败',
    enterHashOrId: '请输入交易哈希或交易ID',
    verifySuccess: '验证成功',
    verifySuccessDesc: '支付已验证，积分已添加到您的账户',
    checkInputInfo: '请检查输入信息是否正确',
    networkError: '网络错误，请稍后重试',
    completed: '支付成功',
    pending: '等待支付',
    processing: '处理中',
    failed: '支付失败',
    unknown: '未知状态',
    paymentSuccess: '支付成功！',
    creditsAdded: '您的积分已添加到账户',
    paymentStatus: '支付状态:',
    refreshStatus: '刷新状态',
    paymentInstructions: '支付说明',
    followSteps: '请按照以下步骤完成支付',
    paymentAddress: '支付地址',
    importantTips: '重要提示：',
    ensureNetwork: (network: string) => `请确保使用 ${network} 网络发送 USDT`,
    sendAmount: (amount: number) => `发送金额必须为 ${amount} USDT`,
    addPaymentIdNote: (paymentId: string) => `建议在备注中填写支付ID: ${paymentId}`,
    confirmTime: '支付确认可能需要 1-3 分钟',
    alipayQrCode: '支付宝收款码',
    receiveAccount: '收款账户',
    paymentTips: '支付说明：',
    scanQrCode: '使用支付宝扫描上方二维码',
    payAmount: (amount: number) => `支付金额: ${amount} 元`,
    addNotePaymentId: (paymentId: string) => `请在备注中填写支付ID: ${paymentId}`,
    autoCredit: '支付成功后积分将自动到账',
    manualVerify: '手动验证支付',
    manualVerifyDesc: '如果您已完成支付但状态未更新，可以手动验证',
    transactionHash: '交易哈希',
    enterUsdtHash: '输入USDT交易哈希',
    sendAddress: '发送地址',
    enterUsdtAddress: '输入您的USDT发送地址',
    transactionId: '交易ID',
    enterAlipayId: '输入支付宝交易ID',
    verifying: '验证中...',
    verifyPayment: '验证支付',
  },
  en: {
    copied: 'Copied',
    copiedDesc: (label: string) => `${label} copied to clipboard`,
    copyFailed: 'Copy Failed',
    copyManually: 'Please copy manually',
    verifyFailed: 'Verification Failed',
    enterHashOrId: 'Please enter transaction hash or transaction ID',
    verifySuccess: 'Verification Successful',
    verifySuccessDesc: 'Payment verified, credits added to your account',
    checkInputInfo: 'Please check if the input information is correct',
    networkError: 'Network error, please try again later',
    completed: 'Payment Successful',
    pending: 'Pending Payment',
    processing: 'Processing',
    failed: 'Payment Failed',
    unknown: 'Unknown Status',
    paymentSuccess: 'Payment Successful!',
    creditsAdded: 'Credits have been added to your account',
    paymentStatus: 'Payment Status:',
    refreshStatus: 'Refresh Status',
    paymentInstructions: 'Payment Instructions',
    followSteps: 'Please follow the steps below to complete payment',
    paymentAddress: 'Payment Address',
    importantTips: 'Important:',
    ensureNetwork: (network: string) => `Please ensure you send USDT using ${network} network`,
    sendAmount: (amount: number) => `Amount must be ${amount} USDT`,
    addPaymentIdNote: (paymentId: string) => `Recommended to add Payment ID in memo: ${paymentId}`,
    confirmTime: 'Payment confirmation may take 1-3 minutes',
    alipayQrCode: 'Alipay QR Code',
    receiveAccount: 'Receiving Account',
    paymentTips: 'Payment Tips:',
    scanQrCode: 'Scan the QR code above with Alipay',
    payAmount: (amount: number) => `Payment amount: ${amount} CNY`,
    addNotePaymentId: (paymentId: string) => `Please add Payment ID in note: ${paymentId}`,
    autoCredit: 'Credits will be automatically added after successful payment',
    manualVerify: 'Manual Verification',
    manualVerifyDesc: 'If you have completed payment but status not updated, you can verify manually',
    transactionHash: 'Transaction Hash',
    enterUsdtHash: 'Enter USDT transaction hash',
    sendAddress: 'Sending Address',
    enterUsdtAddress: 'Enter your USDT sending address',
    transactionId: 'Transaction ID',
    enterAlipayId: 'Enter Alipay transaction ID',
    verifying: 'Verifying...',
    verifyPayment: 'Verify Payment',
  },
};

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
  const { language } = useLanguage();
  const t = TRANSLATIONS[language] || TRANSLATIONS.zh;
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
      const response = await fetch(`/api/payments/status/${paymentId}`, { cache: 'no-store' });
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
        title: t.copied,
        description: t.copiedDesc(label),
      });
    } catch (error) {
      toast({
        title: t.copyFailed,
        description: t.copyManually,
        variant: 'destructive',
      });
    }
  };

  const handleManualVerification = async () => {
    if (!transactionHash && !transactionId) {
      toast({
        title: t.verifyFailed,
        description: t.enterHashOrId,
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
          title: t.verifySuccess,
          description: t.verifySuccessDesc,
        });
        checkPaymentStatus();
        if (onPaymentVerified) {
          onPaymentVerified();
        }
      } else {
        const error = await response.json();
        toast({
          title: t.verifyFailed,
          description: error.error || t.checkInputInfo,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: t.verifyFailed,
        description: t.networkError,
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
        return t.completed;
      case 'pending':
        return t.pending;
      case 'processing':
        return t.processing;
      case 'failed':
        return t.failed;
      default:
        return t.unknown;
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
                {t.paymentSuccess}
              </h3>
              <p className="text-green-600 dark:text-green-300">
                {t.creditsAdded}
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
            <span>{t.paymentStatus} {getStatusText(paymentData?.status || 'pending')}</span>
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
              {t.refreshStatus}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payment Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>{t.paymentInstructions}</CardTitle>
          <CardDescription>
            {t.followSteps}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {paymentMethod === 'usdt' && paymentAddress && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">{t.paymentAddress} ({network})</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Input
                    value={paymentAddress}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(paymentAddress, t.paymentAddress)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                  {t.importantTips}
                </h4>
                <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                  <li>• {t.ensureNetwork(network || '')}</li>
                  <li>• {t.sendAmount(amount)}</li>
                  <li>• {t.addPaymentIdNote(paymentId)}</li>
                  <li>• {t.confirmTime}</li>
                </ul>
              </div>
            </div>
          )}

          {paymentMethod === 'alipay' && qrCodeUrl && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">{t.alipayQrCode}</Label>
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
                <Label className="text-sm font-medium">{t.receiveAccount}</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Input
                    value={account || ''}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(account || '', t.receiveAccount)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                  {t.paymentTips}
                </h4>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• {t.scanQrCode}</li>
                  <li>• {t.payAmount(amount)}</li>
                  <li>• {t.addNotePaymentId(paymentId)}</li>
                  <li>• {t.autoCredit}</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Verification */}
      <Card>
        <CardHeader>
          <CardTitle>{t.manualVerify}</CardTitle>
          <CardDescription>
            {t.manualVerifyDesc}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {paymentMethod === 'usdt' && (
            <>
              <div>
                <Label htmlFor="transactionHash">{t.transactionHash}</Label>
                <Input
                  id="transactionHash"
                  value={transactionHash}
                  onChange={(e) => setTransactionHash(e.target.value)}
                  placeholder={t.enterUsdtHash}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="fromAddress">{t.sendAddress}</Label>
                <Input
                  id="fromAddress"
                  value={fromAddress}
                  onChange={(e) => setFromAddress(e.target.value)}
                  placeholder={t.enterUsdtAddress}
                  className="mt-1"
                />
              </div>
            </>
          )}

          {paymentMethod === 'alipay' && (
            <div>
              <Label htmlFor="transactionId">{t.transactionId}</Label>
              <Input
                id="transactionId"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder={t.enterAlipayId}
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
                {t.verifying}
              </>
            ) : (
              t.verifyPayment
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
} 