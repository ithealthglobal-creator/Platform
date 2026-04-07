import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { calculateCompositeScore } from '@/lib/composite-scoring'

export async function POST(req: NextRequest) {
  // Service-role only: Bearer token must match SUPABASE_SERVICE_ROLE_KEY
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const token = authHeader.replace('Bearer ', '')

  if (token !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { userId?: string; source?: string; sourceId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { userId, source, sourceId } = body

  if (!userId || !source) {
    return NextResponse.json({ error: 'userId and source are required' }, { status: 400 })
  }

  // Get user's company_id from profile
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('company_id')
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const companyId = profile.company_id as string

  // Calculate composite score
  const scores = await calculateCompositeScore(userId)

  if (!scores) {
    return NextResponse.json({ error: 'No assessment data found for user' }, { status: 404 })
  }

  // Insert skill_snapshots row
  const { data: snapshot, error: insertError } = await supabaseAdmin
    .from('skill_snapshots')
    .insert({
      user_id: userId,
      company_id: companyId,
      overall_score: scores.overall,
      phase_scores: scores.phases,
      service_scores: scores.services,
      source: source as 'onboarding' | 'assessment' | 'course_completion',
      source_id: sourceId ?? null,
      snapshot_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ snapshot }, { status: 201 })
}
