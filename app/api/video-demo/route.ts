/**
 * 视频演示公开 API
 * Video Demo Public API
 *
 * 支持双环境:
 * - CN 环境: 腾讯云 Cloudbase
 * - INTL 环境: Supabase
 *
 * GET /api/video-demo - 获取当前激活的视频演示记录
 */

import { NextResponse } from 'next/server';
import { getServiceDbClient } from '@/lib/db-client';
import { getDeploymentRegionFromRequest } from '@/lib/config/request-region';
import { resolveVideoUrls } from '@/lib/video-demo/admin-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const region = getDeploymentRegionFromRequest(request);
    const db = await getServiceDbClient();

    const { data, error } = await db
      .from('video_demos')
      .select('*')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (error) {
      // "PGRST116" is the Supabase/PostgREST code for "no rows returned" from .single()
      // In that case we return null data with 200, not an error
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: true, data: null },
          { status: 200 }
        );
      }

      console.error('Error fetching active video demo:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch video demo' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { success: true, data: null },
        { status: 200 }
      );
    }

    const normalized = [{
      id: String(data.id || data._id || ''),
      video_url: String(data.video_url || ''),
      title: String(data.title || ''),
      description: typeof data.description === 'string' ? data.description : '',
      created_at: typeof data.created_at === 'string' ? data.created_at : new Date().toISOString(),
      updated_at: typeof data.updated_at === 'string' ? data.updated_at : new Date().toISOString(),
      is_active: !!data.is_active,
      source: region,
    }] as any;

    const resolved = await resolveVideoUrls(normalized, region);
    const item = resolved[0] || data;

    return NextResponse.json(
      { success: true, data: item },
      { status: 200 }
    );
  } catch (error) {
    console.error('Video demo API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
