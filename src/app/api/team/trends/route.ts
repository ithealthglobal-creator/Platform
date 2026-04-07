import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase-server'
import type { TeamTrendPoint } from '@/lib/types'

/** Return the ISO week string (Monday-based) for a given date, e.g. "2026-W14" */
function isoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  // Adjust to Thursday in current week (ISO weeks start on Monday)
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const token = authHeader.replace('Bearer ', '')
  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify caller is a company admin
  const { data: callerProfile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('company_id, is_company_admin')
    .eq('id', user.id)
    .single()

  if (profileError || !callerProfile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }
  if (!callerProfile.is_company_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const companyId = callerProfile.company_id as string

  // Parse period query param
  const { searchParams } = new URL(req.url)
  const periodRaw = searchParams.get('period') ?? '30'
  const period = [30, 60, 90].includes(Number(periodRaw)) ? Number(periodRaw) : 30

  const since = new Date()
  since.setDate(since.getDate() - period)

  const { data: snapshots, error: snapshotsError } = await supabaseAdmin
    .from('skill_snapshots')
    .select('overall_score, phase_scores, snapshot_at')
    .eq('company_id', companyId)
    .gte('snapshot_at', since.toISOString())
    .order('snapshot_at', { ascending: true })

  if (snapshotsError) {
    return NextResponse.json({ error: snapshotsError.message }, { status: 500 })
  }

  // Group by ISO week and calculate weekly averages
  const weekMap = new Map<
    string,
    { overallSum: number; phaseTotals: Map<string, { sum: number; count: number }>; count: number }
  >()

  for (const snap of snapshots ?? []) {
    const week = isoWeek(new Date(snap.snapshot_at as string))
    const existing = weekMap.get(week) ?? {
      overallSum: 0,
      phaseTotals: new Map(),
      count: 0,
    }

    existing.overallSum += snap.overall_score as number
    existing.count += 1

    const phaseScores = (snap.phase_scores as Record<string, number>) ?? {}
    for (const [phaseId, score] of Object.entries(phaseScores)) {
      const acc = existing.phaseTotals.get(phaseId) ?? { sum: 0, count: 0 }
      acc.sum += score
      acc.count += 1
      existing.phaseTotals.set(phaseId, acc)
    }

    weekMap.set(week, existing)
  }

  const dataPoints: TeamTrendPoint[] = Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, data]) => {
      const phases: Record<string, number> = {}
      for (const [phaseId, { sum, count }] of data.phaseTotals.entries()) {
        phases[phaseId] = Math.round(sum / count)
      }
      return {
        week,
        overall: Math.round(data.overallSum / data.count),
        phases,
      }
    })

  return NextResponse.json({ dataPoints })
}
