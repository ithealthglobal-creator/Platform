import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase-server'
import { calculateCompositeScore, calculateTeamAverages } from '@/lib/composite-scoring'
import type { TeamDashboardData } from '@/lib/types'

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

  // Fetch all active profiles for the company
  const { data: members, error: membersError } = await supabaseAdmin
    .from('profiles')
    .select('id, display_name, email, is_company_admin')
    .eq('company_id', companyId)
    .eq('is_active', true)

  if (membersError) {
    return NextResponse.json({ error: membersError.message }, { status: 500 })
  }

  const memberList = members ?? []

  // Calculate composite scores and course counts in parallel
  const [scoresResults, enrollmentsData] = await Promise.all([
    Promise.all(memberList.map(m => calculateCompositeScore(m.id as string).catch(() => null))),
    supabaseAdmin
      .from('user_course_enrollments')
      .select('user_id')
      .in('user_id', memberList.map(m => m.id as string))
      .not('completed_at', 'is', null),
  ])

  // Count completed courses per member
  const courseCountByMember = new Map<string, number>()
  for (const row of enrollmentsData.data ?? []) {
    const uid = row.user_id as string
    courseCountByMember.set(uid, (courseCountByMember.get(uid) ?? 0) + 1)
  }

  const enrichedMembers: TeamDashboardData['members'] = memberList.map((m, i) => ({
    id: m.id as string,
    display_name: m.display_name as string,
    email: m.email as string,
    is_company_admin: m.is_company_admin as boolean,
    scores: scoresResults[i],
    coursesCompleted: courseCountByMember.get(m.id as string) ?? 0,
  }))

  const teamAverages = calculateTeamAverages(scoresResults)

  // 30-day trend: fetch avg overall from skill_snapshots 30 days ago
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: oldSnapshots } = await supabaseAdmin
    .from('skill_snapshots')
    .select('overall_score')
    .eq('company_id', companyId)
    .lte('snapshot_at', thirtyDaysAgo.toISOString())
    .order('snapshot_at', { ascending: false })

  let trend30d = 0
  if (oldSnapshots && oldSnapshots.length > 0) {
    const oldAvg =
      (oldSnapshots as { overall_score: number }[]).reduce((sum, s) => sum + s.overall_score, 0) /
      oldSnapshots.length
    trend30d = Math.round(teamAverages.overall - oldAvg)
  }

  const totalCoursesCompleted = enrichedMembers.reduce((sum, m) => sum + m.coursesCompleted, 0)

  const result: TeamDashboardData = {
    members: enrichedMembers,
    teamAverages,
    stats: {
      memberCount: enrichedMembers.length,
      avgMaturity: teamAverages.overall,
      trend30d,
      coursesCompleted: totalCoursesCompleted,
    },
  }

  return NextResponse.json(result)
}
