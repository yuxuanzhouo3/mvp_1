import { NextRequest, NextResponse } from 'next/server';
import { isChinaDeployment } from '@/lib/config/deployment.config';

export async function GET(request: NextRequest) {
  const isCN = isChinaDeployment();

  return NextResponse.json({
    environment: isCN ? 'CN' : 'INTL',
    NEXT_PUBLIC_DEPLOYMENT_REGION: process.env.NEXT_PUBLIC_DEPLOYMENT_REGION,
    timestamp: new Date().toISOString(),
    headers: {
      host: request.headers.get('host'),
      'x-deployment-region': request.headers.get('x-deployment-region'),
    }
  });
}
