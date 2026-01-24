import type { ScoreStatistics } from './percentile'

export function getScoreRanking(percentile: number): string {
  if (percentile >= 95) {
    return 'Top 5%'
  } else if (percentile >= 90) {
    return 'Top 10%'
  } else if (percentile >= 80) {
    return 'Top 20%'
  } else if (percentile >= 70) {
    return 'Top 30%'
  } else if (percentile >= 50) {
    return 'Above Average'
  } else if (percentile >= 30) {
    return 'Below Average'
  } else {
    return 'Bottom 30%'
  }
}

export async function getScoreStatistics(): Promise<ScoreStatistics | null> {
  const response = await fetch('/api/percentile/stats', { cache: 'no-store' })
  if (!response.ok) return null

  const payload = (await response.json()) as { data?: ScoreStatistics | null }
  return payload.data ?? null
}

export function getScoreGrade(totalScore: number): 'S' | 'A' | 'B' | 'C' | 'D' {
  if (totalScore >= 90) return 'S'
  if (totalScore >= 80) return 'A'
  if (totalScore >= 70) return 'B'
  if (totalScore >= 60) return 'C'
  return 'D'
}

export function getGradeColor(grade: 'S' | 'A' | 'B' | 'C' | 'D'): string {
  switch (grade) {
    case 'S':
      return 'text-amber-500'
    case 'A':
      return 'text-purple-500'
    case 'B':
      return 'text-blue-500'
    case 'C':
      return 'text-green-500'
    case 'D':
      return 'text-gray-500'
  }
}

export function getGradeBgColor(grade: 'S' | 'A' | 'B' | 'C' | 'D'): string {
  switch (grade) {
    case 'S':
      return 'bg-amber-500/10 border-amber-500/20'
    case 'A':
      return 'bg-purple-500/10 border-purple-500/20'
    case 'B':
      return 'bg-blue-500/10 border-blue-500/20'
    case 'C':
      return 'bg-green-500/10 border-green-500/20'
    case 'D':
      return 'bg-gray-500/10 border-gray-500/20'
  }
}
