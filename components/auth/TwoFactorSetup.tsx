'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { Shield, CheckCircle, AlertCircle } from 'lucide-react';

export default function TwoFactorSetup() {
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'setup' | 'verify' | 'enabled'>('setup');
  // const { enable2FA, verify2FA, user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Check if 2FA is already enabled
    // if (user) {
    //   // This would typically come from user profile
    //   setIsEnabled(false); // For demo purposes
    // }
  }, []);

  const handleEnable2FA = async () => {
    setIsLoading(true);
    try {
      // const { error, data } = await enable2FA();
      
      // if (error) {
      //   toast({
      //     title: 'Error',
      //     description: error.message || 'Failed to enable 2FA',
      //     variant: 'destructive',
      //   });
      // } else if (data) {
      //   setQrCode(data.qrCode);
      //   setSecret(data.secret);
      //   setStep('verify');
      //   toast({
      //     title: '2FA Setup',
      //     description: 'Scan the QR code with your authenticator app',
      //   });
      // }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: 'Invalid Code',
        description: 'Please enter a 6-digit verification code',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      // const { error } = await verify2FA(verificationCode);
      
      // if (error) {
      //   toast({
      //     title: 'Verification Failed',
      //     description: error.message || 'Invalid verification code',
      //     variant: 'destructive',
      //   });
      // } else {
      //   setIsEnabled(true);
      //   setStep('enabled');
      //   toast({
      //     title: '2FA Enabled',
      //     description: 'Two-factor authentication has been successfully enabled',
      //   });
      // }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isEnabled && step === 'enabled') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle>2FA Enabled</CardTitle>
          <CardDescription>
            Two-factor authentication is now active on your account
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-gray-600 mb-4">
            You'll need to enter a verification code from your authenticator app when signing in.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setStep('setup');
              setIsEnabled(false);
              setVerificationCode('');
            }}
          >
            Disable 2FA
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === 'verify') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Verify 2FA Setup</CardTitle>
          <CardDescription>
            Enter the 6-digit code from your authenticator app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {qrCode && (
            <div className="text-center">
              <div className="mb-4 p-4 bg-white rounded-lg inline-block">
                <img src={qrCode} alt="QR Code" className="w-48 h-48" />
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Scan this QR code with your authenticator app
              </p>
              <p className="text-xs text-gray-500">
                Manual entry code: <code className="bg-gray-100 px-2 py-1 rounded">{secret}</code>
              </p>
            </div>
          )}
          
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="Enter 6-digit code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              maxLength={6}
              className="text-center text-lg tracking-widest"
            />
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => setStep('setup')}
              className="flex-1"
            >
              Back
            </Button>
            <Button
              onClick={handleVerify2FA}
              disabled={isLoading || verificationCode.length !== 6}
              className="flex-1"
            >
              {isLoading ? 'Verifying...' : 'Verify'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
          <Shield className="h-6 w-6 text-blue-600" />
        </div>
        <CardTitle>Two-Factor Authentication</CardTitle>
        <CardDescription>
          Add an extra layer of security to your account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h3 className="font-medium">How it works:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Download an authenticator app (Google Authenticator, Authy, etc.)</li>
            <li>• Scan the QR code that appears after setup</li>
            <li>• Enter the 6-digit code to verify</li>
            <li>• Use the app to generate codes for future logins</li>
          </ul>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium">Important:</p>
              <p>Keep your authenticator app secure. If you lose access, you may be locked out of your account.</p>
            </div>
          </div>
        </div>
        
        <Button
          onClick={handleEnable2FA}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Setting up...' : 'Enable 2FA'}
        </Button>
      </CardContent>
    </Card>
  );
} 