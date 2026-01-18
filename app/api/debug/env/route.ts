/**
 * 调试 API：检查服务端环境变量配置
 * 仅在开发环境或通过特定密钥访问
 * 
 * 访问方式：GET /api/debug/env?key=debug123
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // 安全检查：需要正确的调试密钥
  const debugKey = request.nextUrl.searchParams.get('key');
  const expectedKey = process.env.DEBUG_API_KEY || 'debug123';
  
  if (debugKey !== expectedKey) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // 收集环境变量信息（隐藏敏感值）
  const envInfo = {
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    
    // 部署区域配置
    NEXT_PUBLIC_DEPLOYMENT_REGION: process.env.NEXT_PUBLIC_DEPLOYMENT_REGION || 'NOT SET',
    
    // Cloudbase 配置（只显示是否设置，不显示实际值）
    CLOUDBASE_ENV_ID: process.env.CLOUDBASE_ENV_ID ? `SET (${process.env.CLOUDBASE_ENV_ID.substring(0, 10)}...)` : 'NOT SET',
    NEXT_PUBLIC_CLOUDBASE_ENV_ID: process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID ? `SET (${process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID.substring(0, 10)}...)` : 'NOT SET',
    CLOUDBASE_SECRET_ID: process.env.CLOUDBASE_SECRET_ID ? 'SET (hidden)' : 'NOT SET',
    CLOUDBASE_SECRET_KEY: process.env.CLOUDBASE_SECRET_KEY ? 'SET (hidden)' : 'NOT SET',
    
    // Supabase 配置
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? `SET (${process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 30)}...)` : 'NOT SET',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET (hidden)' : 'NOT SET',
    
    // 其他有用信息
    PORT: process.env.PORT || 'NOT SET',
    HOSTNAME: process.env.HOSTNAME || 'NOT SET',
  };

  // 诊断建议
  const diagnostics = [];
  
  if (envInfo.NEXT_PUBLIC_DEPLOYMENT_REGION === 'NOT SET') {
    diagnostics.push('❌ NEXT_PUBLIC_DEPLOYMENT_REGION 未设置，CN 认证功能将无法工作');
  } else if (envInfo.NEXT_PUBLIC_DEPLOYMENT_REGION !== 'CN') {
    diagnostics.push(`⚠️ NEXT_PUBLIC_DEPLOYMENT_REGION=${envInfo.NEXT_PUBLIC_DEPLOYMENT_REGION}，不是 CN 环境`);
  } else {
    diagnostics.push('✅ NEXT_PUBLIC_DEPLOYMENT_REGION=CN 正确');
  }
  
  if (envInfo.CLOUDBASE_ENV_ID === 'NOT SET' && envInfo.NEXT_PUBLIC_CLOUDBASE_ENV_ID === 'NOT SET') {
    diagnostics.push('❌ Cloudbase ENV_ID 未设置，数据库操作将失败');
  } else {
    diagnostics.push('✅ Cloudbase ENV_ID 已设置');
  }
  
  if (envInfo.CLOUDBASE_SECRET_ID === 'NOT SET' || envInfo.CLOUDBASE_SECRET_KEY === 'NOT SET') {
    diagnostics.push('❌ Cloudbase Secret 未完整设置，API 认证将失败');
  } else {
    diagnostics.push('✅ Cloudbase Secret 已设置');
  }

  return NextResponse.json({
    success: true,
    environment: envInfo,
    diagnostics,
  });
}

