/**
 * 逆地理编码 API 代理
 * 解决腾讯地图 CORS 问题，同时隐藏 API Key
 */

import { NextRequest, NextResponse } from 'next/server';
import { isChinaDeployment } from '@/lib/config/deployment.config';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  console.log('[Geo Reverse] Request:', { lat, lng, isCN: isChinaDeployment() });

  if (!lat || !lng) {
    return NextResponse.json({ error: '缺少经纬度参数' }, { status: 400 });
  }

  try {
    if (isChinaDeployment()) {
      // CN 环境：使用腾讯地图
      const tencentKey = process.env.TENCENT_MAP_KEY;
      console.log('[Geo Reverse] Tencent Key exists:', !!tencentKey);

      if (!tencentKey) {
        return NextResponse.json({ error: '地图服务未配置' }, { status: 500 });
      }

      const response = await fetch(
        `https://apis.map.qq.com/ws/geocoder/v1/?location=${lat},${lng}&key=${tencentKey}&get_poi=0`
      );

      if (!response.ok) {
        throw new Error('腾讯地图 API 请求失败');
      }

      const data = await response.json();
      console.log('[Geo Reverse] Tencent response:', JSON.stringify(data));

      if (data.status === 0 && data.result?.address_component) {
        const addr = data.result.address_component;
        return NextResponse.json({
          city: addr.city || addr.district || addr.province || '',
        });
      }

      return NextResponse.json({ city: '' });
    } else {
      // INTL 环境：使用 OpenStreetMap
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
        { headers: { 'User-Agent': 'PersonaLink/1.0' } }
      );

      if (!response.ok) {
        throw new Error('OpenStreetMap API 请求失败');
      }

      const data = await response.json();
      const city = data.address?.city || data.address?.town || data.address?.municipality || data.address?.county || '';
      const country = data.address?.country || '';

      return NextResponse.json({
        city: country ? `${city}, ${country}` : city,
      });
    }
  } catch (error) {
    console.error('[Geo Reverse] Error:', error);
    return NextResponse.json({ city: '' });
  }
}
