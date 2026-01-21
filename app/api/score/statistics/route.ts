import { NextRequest, NextResponse } from 'next/server';
import { getServiceDbClient, isChinaDeployment } from '@/lib/db-client';
import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import type { GenderEnum } from '@/types/database';

type ScoreStatistics = {
  avgScore: number;
  medianScore: number;
  minScore: number;
  maxScore: number;
  totalUsers: number;
};

function computeStatistics(scores: number[]): ScoreStatistics | null {
  const validScores = scores.filter((s) => Number.isFinite(s));
  if (validScores.length === 0) return null;

  validScores.sort((a, b) => a - b);

  const totalUsers = validScores.length;
  const minScore = validScores[0]!;
  const maxScore = validScores[totalUsers - 1]!;
  const sum = validScores.reduce((acc, s) => acc + s, 0);
  const avgScore = Math.round((sum / totalUsers) * 100) / 100;
  const mid = Math.floor(totalUsers / 2);
  const medianScore =
    totalUsers % 2 === 1
      ? validScores[mid]!
      : Math.round(((validScores[mid - 1]! + validScores[mid]!) / 2) * 100) / 100;

  return { avgScore, medianScore, minScore, maxScore, totalUsers };
}

export async function GET(request: NextRequest) {
  const genderParam = request.nextUrl.searchParams.get('gender') || null;
  const gender =
    genderParam === 'male' || genderParam === 'female' ? (genderParam as GenderEnum) : null;

  try {
    if (isChinaDeployment()) {
      const cnSession =
        request.cookies.get('cn_session')?.value ||
        request.cookies.get('cn_session_cross')?.value;

      if (!cnSession) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const db = await getServiceDbClient();

      const pageSize = 500;
      let from = 0;
      const scores: number[] = [];

      while (true) {
        let query = db
          .from('v_active_users')
          .select('*')
          .range(from, from + pageSize - 1);

        if (gender) {
          query = query.eq('gender', gender);
        }

        const { data, error } = await query;
        if (error) {
          return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 });
        }

        const rows: any[] = data || [];
        for (const row of rows) {
          const totalScore = row?.market_value_score?.totalScore;
          const scoreNum =
            typeof totalScore === 'number' ? totalScore : Number.parseFloat(String(totalScore));
          if (Number.isFinite(scoreNum)) {
            scores.push(scoreNum);
          }
        }

        if (rows.length < pageSize) {
          break;
        }
        from += pageSize;
      }

      return NextResponse.json(computeStatistics(scores));
    }

    const supabase = createSupabaseClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let db: any;
    try {
      db = await getServiceDbClient();
    } catch {
      db = supabase;
    }

    const { data, error } = await db.rpc('get_score_statistics', { p_gender: gender });
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json(null);
    }

    const stats = data[0];
    return NextResponse.json({
      avgScore: Number(stats.avg_score),
      medianScore: Number(stats.median_score),
      minScore: Number(stats.min_score),
      maxScore: Number(stats.max_score),
      totalUsers: Number(stats.total_users),
    } satisfies ScoreStatistics);
  } catch (error) {
    console.error('[Score Statistics] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

