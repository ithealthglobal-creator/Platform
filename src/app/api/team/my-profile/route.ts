import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase-server'
import { calculateCompositeScore, calculateTeamAverages } from '@/lib/composite-scoring'
import { getPhaseColor } from '@/lib/phase-colors'
import type { MemberProfile } from '@/lib/types'

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

  // Get caller's profile (any authenticated user with company_id)
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, company_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }
  if (!profile.company_id) {
    return NextResponse.json({ error: 'No company associated with this profile' }, { status: 400 })
  }

  const companyId = profile.company_id as string

  // Calculate user's own composite score
  const myScores = await calculateCompositeScore(user.id)

  if (!myScores) {
    return NextResponse.json({ error: 'No assessment data found' }, { status: 404 })
  }

  // Fetch all team member IDs for the company
  const { data: teamMembers, error: teamError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('company_id', companyId)
    .eq('is_active', true)

  if (teamError) {
    return NextResponse.json({ error: teamError.message }, { status: 500 })
  }

  // Calculate scores for all team members (including the caller)
  const memberIds = (teamMembers ?? []).map(m => m.id as string)
  const allScores = await Promise.all(
    memberIds.map(id => calculateCompositeScore(id).catch(() => null))
  )
  const teamAverages = calculateTeamAverages(allScores)

  // Find recommended courses: user's weakest 6 services
  const serviceEntries = Object.entries(myScores.services)
    .sort(([, a], [, b]) => a.pct - b.pct)
    .slice(0, 6)

  const weakestServiceIds = serviceEntries.map(([id]) => id)

  // Look up linked courses via service_academy_links
  const { data: links, error: linksError } = await supabaseAdmin
    .from('service_academy_links')
    .select('service_id, course_id, courses(id, name, phase_id)')
    .in('service_id', weakestServiceIds)

  if (linksError) {
    return NextResponse.json({ error: linksError.message }, { status: 500 })
  }

  // Get service names and phase info
  const { data: services, error: servicesError } = await supabaseAdmin
    .from('services')
    .select('id, name, phase_id, phases(id, name)')
    .in('id', weakestServiceIds)

  if (servicesError) {
    return NextResponse.json({ error: servicesError.message }, { status: 500 })
  }

  const serviceMap = new Map<
    string,
    { name: string; phase_id: string; phase_name: string }
  >()
  for (const svc of services ?? []) {
    const phase = (svc.phases as unknown) as { id: string; name: string } | null
    serviceMap.set(svc.id as string, {
      name: svc.name as string,
      phase_id: svc.phase_id as string,
      phase_name: phase?.name ?? '',
    })
  }

  // Build recommended courses list (deduplicated by course_id)
  const seenCourseIds = new Set<string>()
  const recommendedCourses: MemberProfile['recommendedCourses'] = []

  for (const link of links ?? []) {
    const serviceId = link.service_id as string
    const course = (link.courses as unknown) as { id: string; name: string; phase_id: string | null } | null
    if (!course || seenCourseIds.has(course.id)) continue

    seenCourseIds.add(course.id)

    const svcInfo = serviceMap.get(serviceId)
    const phaseName = svcInfo?.phase_name ?? ''
    const serviceScore = myScores.services[serviceId]?.pct ?? 0

    recommendedCourses.push({
      id: course.id,
      name: course.name,
      phase_name: phaseName,
      phase_color: getPhaseColor(phaseName),
      service_name: svcInfo?.name ?? '',
      service_score: serviceScore,
    })
  }

  const result: MemberProfile = {
    myScores,
    teamAverages,
    recommendedCourses,
  }

  return NextResponse.json(result)
}
