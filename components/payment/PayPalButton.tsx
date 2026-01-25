'use client';

import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface PayPalButtonProps {
  orderId: string;
  paymentId: string;
  amount: number;
  credits: number;
  onSuccess?: () => void;
  onError?: (error: any) => void;
  onCancel?: () => void;
}

export default function PayPalButton({
  orderId,
  paymentId,
  amount,
  credits,
  onSuccess,
  onError,
  onCancel,
}: PayPalButtonProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

  if (!clientId) {
    return (
      <div className="text-center text-muted-foreground py-4">
        PayPal is not configured
      </div>
    );
  }

  const handleApprove = async (data: any) => {
    setIsProcessing(true);

    try {
      // 调用 capture API
      const response = await fetch('/api/payments/paypal/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: data.orderID,
          paymentId: paymentId,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: '支付成功',
          description: `已成功购买 ${credits} 积分`,
        });
        onSuccess?.();
        router.push(`/payment/success?provider=paypal&paymentId=${paymentId}&token=${encodeURIComponent(data.orderID)}`);
      } else {
        throw new Error(result.error || 'Payment capture failed');
      }
    } catch (error: any) {
      console.error('[PayPal] Capture error:', error);
      toast({
        title: '支付失败',
        description: error.message || '请稍后重试',
        variant: 'destructive',
      });
      onError?.(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleError = (err: any) => {
    console.error('[PayPal] Button error:', err);
    toast({
      title: '支付出错',
      description: '请检查网络连接后重试',
      variant: 'destructive',
    });
    onError?.(err);
  };

  const handleCancel = () => {
    toast({
      title: '支付已取消',
      description: '您可以随时重新发起支付',
    });
    onCancel?.();
  };

  if (isProcessing) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>正在处理支付...</span>
      </div>
    );
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId: clientId,
        currency: 'USD',
        intent: 'capture',
      }}
    >
      <PayPalButtons
        style={{
          layout: 'vertical',
          color: 'blue',
          shape: 'rect',
          label: 'pay',
          height: 45,
        }}
        disabled={isProcessing}
        createOrder={async () => {
          // 直接返回后端创建的订单 ID
          return orderId;
        }}
        onApprove={handleApprove}
        onError={handleError}
        onCancel={handleCancel}
      />
    </PayPalScriptProvider>
  );
}

/**
 * PayPal 按钮包装组件 - 用于在支付选择后显示
 */
interface PayPalCheckoutProps {
  paymentData: {
    orderId: string;
    paymentId: string;
    amount: number;
    credits: number;
  } | null;
  onSuccess?: () => void;
  onError?: (error: any) => void;
  onCancel?: () => void;
}

export function PayPalCheckout({
  paymentData,
  onSuccess,
  onError,
  onCancel,
}: PayPalCheckoutProps) {
  if (!paymentData) {
    return null;
  }

  return (
    <div className="mt-4 p-4 border rounded-lg bg-muted/30">
      <div className="text-sm text-muted-foreground mb-3 text-center">
        请使用 PayPal 完成支付
      </div>
      <PayPalButton
        orderId={paymentData.orderId}
        paymentId={paymentData.paymentId}
        amount={paymentData.amount}
        credits={paymentData.credits}
        onSuccess={onSuccess}
        onError={onError}
        onCancel={onCancel}
      />
      <div className="text-xs text-muted-foreground mt-3 text-center">
        支付金额: ${paymentData.amount.toFixed(2)} USD
      </div>
    </div>
  );
}
