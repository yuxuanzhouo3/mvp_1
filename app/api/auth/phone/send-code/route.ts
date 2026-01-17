/**
 * 手机验证码发送 API
 * Phone Verification Code Send API
 * 
 * ⚠️ 此功能已禁用 - Phone login has been disabled
 * 请使用邮箱或微信登录
 */

import { NextResponse } from 'next/server';

export async function POST() {
  // 手机号登录功能已禁用
  return NextResponse.json(
    { 
      error: '手机号登录功能已禁用，请使用邮箱或微信登录',
      errorCode: 'FEATURE_DISABLED',
      message: 'Phone login has been disabled. Please use email or WeChat login.',
    },
    { status: 410 } // 410 Gone - 资源不再可用
  );
}

