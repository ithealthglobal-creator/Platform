import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { calculateServiceScores, calculatePhaseScores, calculateOverallScore } from '@/lib/scoring'
import type { AssessmentQuestion } from '@/lib/types'

export async function POST(request: NextRequest) {
  let companyId: string | null = null
  let authUserId: string | null = null
  let profileId: string | null = null

  try {
    const body = await request.json()
    const { name, company_name, email, assessment_id, answers, lead_source } = body

    // 1. Validate required fields
    if (!name || !company_name || !email || !assessment_id || !answers) {
      return NextResponse.json(
        { error: 'Missing required fields: name, company_name, email, assessment_id, answers' },
        { status: 400 }
      )
    }

    if (!Array.isArray(answers)) {
      return NextResponse.json({ error: 'answers must be an array' }, { status: 400 })
    }

    // 2. Rate limiting: check if a profile with this email was created in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { data: recentProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, created_at')
      .eq('email', email)
      .gte('created_at', oneHourAgo)
      .maybeSingle()

    if (recentProfile) {
      return NextResponse.json(
        { error: 'An account with this email was recently created. Please wait before trying again.' },
        { status: 429 }
      )
    }

    // 3. Check for existing user by email
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingProfile) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 409 }
      )
    }

    // 4. Create company
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert({ name: company_name, type: 'customer', status: 'prospect' })
      .select('id')
      .single()

    if (companyError || !company) {
      return NextResponse.json(
        { error: companyError?.message ?? 'Failed to create company' },
        { status: 400 }
      )
    }
    companyId = company.id

    // 5. Create auth user + send invite
    const origin =
      request.headers.get('origin') ??
      request.headers.get('x-forwarded-host') ??
      process.env.NEXT_PUBLIC_APP_URL ??
      'http://localhost:3000'

    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: { company_id: companyId, display_name: name },
        redirectTo: `${origin}/set-password`,
      }
    )

    if (inviteError || !inviteData?.user) {
      // Cleanup: delete company
      await supabaseAdmin.from('companies').delete().eq('id', companyId)
      return NextResponse.json(
        { error: inviteError?.message ?? 'Failed to send invite' },
        { status: 400 }
      )
    }
    authUserId = inviteData.user.id

    // 6. Create profile
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: authUserId,
      email,
      display_name: name,
      company_id: companyId,
      role: 'customer',
    })

    if (profileError) {
      // Cleanup: delete auth user + company
      await supabaseAdmin.auth.admin.deleteUser(authUserId)
      await supabaseAdmin.from('companies').delete().eq('id', companyId)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }
    profileId = authUserId

    // 7. Fetch assessment questions and calculate scores
    const { data: questions, error: questionsError } = await supabaseAdmin
      .from('assessment_questions')
      .select('*, service:services(id, phase_id)')
      .eq('assessment_id', assessment_id)
      .eq('is_active', true)
      .order('sort_order')

    if (questionsError) {
      // Cleanup: delete profile + auth user + company
      await supabaseAdmin.from('profiles').delete().eq('id', profileId)
      await supabaseAdmin.auth.admin.deleteUser(authUserId)
      await supabaseAdmin.from('companies').delete().eq('id', companyId)
      return NextResponse.json({ error: questionsError.message }, { status: 400 })
    }

    const typedQuestions = (questions ?? []) as AssessmentQuestion[]
    const serviceScores = calculateServiceScores(typedQuestions, answers)
    const phaseScores = calculatePhaseScores(serviceScores)
    const overallScore = calculateOverallScore(phaseScores)

    // Build phase_scores map: { [phase_id]: score }
    const phaseScoresMap: Record<string, number> = {}
    for (const ps of phaseScores) {
      phaseScoresMap[ps.phase_id] = ps.score
    }

    // Build service_scores map: { [service_id]: { earned, max, pct } }
    const serviceScoresMap: Record<string, { earned: number; max: number; pct: number }> = {}
    for (const ss of serviceScores) {
      serviceScoresMap[ss.service_id] = { earned: ss.earned, max: ss.max, pct: ss.pct }
    }

    // 8. Insert assessment attempt
    const now = new Date().toISOString()
    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from('assessment_attempts')
      .insert({
        assessment_id,
        user_id: authUserId,
        score: overallScore,
        passed: false, // onboarding attempts are not pass/fail
        answers,
        phase_scores: phaseScoresMap,
        service_scores: serviceScoresMap,
        started_at: now,
        completed_at: now,
      })
      .select('id')
      .single()

    if (attemptError || !attempt) {
      // Cleanup: delete profile + auth user + company
      await supabaseAdmin.from('profiles').delete().eq('id', profileId)
      await supabaseAdmin.auth.admin.deleteUser(authUserId)
      await supabaseAdmin.from('companies').delete().eq('id', companyId)
      return NextResponse.json(
        { error: attemptError?.message ?? 'Failed to save assessment attempt' },
        { status: 400 }
      )
    }

    // 9. Resolve Meta ad/campaign FKs from URL params (best-effort)
    const source = (lead_source ?? {}) as {
      utm_source?: string | null
      utm_medium?: string | null
      utm_campaign?: string | null
      utm_content?: string | null
      utm_term?: string | null
      meta_ad_id?: string | null
      meta_campaign_id?: string | null
      landing_path?: string | null
      referrer?: string | null
    }

    let resolvedMetaAdId: string | null = null
    let resolvedMetaCampaignId: string | null = null

    if (source.meta_ad_id) {
      const { data: ad } = await supabaseAdmin
        .from('meta_ads')
        .select('id, ad_set:meta_ad_sets(campaign_id)')
        .eq('meta_ad_id', source.meta_ad_id)
        .maybeSingle()
      if (ad) {
        resolvedMetaAdId = ad.id
        const adSet = (ad as unknown as { ad_set?: { campaign_id?: string } }).ad_set
        if (adSet?.campaign_id) resolvedMetaCampaignId = adSet.campaign_id
      }
    }

    if (!resolvedMetaCampaignId && source.meta_campaign_id) {
      const { data: campaign } = await supabaseAdmin
        .from('meta_campaigns')
        .select('id')
        .eq('meta_campaign_id', source.meta_campaign_id)
        .maybeSingle()
      if (campaign) resolvedMetaCampaignId = campaign.id
    }

    // 10. Create sales lead in the first active sales stage
    const { data: firstStage } = await supabaseAdmin
      .from('sales_stages')
      .select('id')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (firstStage) {
      await supabaseAdmin.from('sales_leads').insert({
        company_id: companyId,
        stage_id: firstStage.id,
        assessment_attempt_id: attempt.id,
        contact_name: name,
        contact_email: email,
        utm_source: source.utm_source ?? null,
        utm_medium: source.utm_medium ?? null,
        utm_campaign: source.utm_campaign ?? null,
        utm_content: source.utm_content ?? null,
        utm_term: source.utm_term ?? null,
        landing_path: source.landing_path ?? null,
        referrer: source.referrer ?? null,
        meta_ad_id: resolvedMetaAdId,
        meta_campaign_id: resolvedMetaCampaignId,
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    // Unexpected error — best-effort cleanup
    if (profileId) {
      await supabaseAdmin.from('profiles').delete().eq('id', profileId)
    }
    if (authUserId) {
      await supabaseAdmin.auth.admin.deleteUser(authUserId)
    }
    if (companyId) {
      await supabaseAdmin.from('companies').delete().eq('id', companyId)
    }

    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
