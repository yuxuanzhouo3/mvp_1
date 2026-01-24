import { NextResponse } from 'next/server'
import { getScoreStatistics } from '@/lib/percentile'

export const dynamic = 'force-dynamic'

export async function GET() {
  const stats = await getScoreStatistics()
  return NextResponse.json({ data: stats })
}
