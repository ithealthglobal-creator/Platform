import { isAdminOrAbove } from '@/lib/auth-utils'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { decrypt } from '@/lib/encryption'
import { metaApiGet, computeEmqScore } from '@/lib/meta-api'

// Allow both admin user auth and service_role Bearer token (for pg_cron)
async function verifyAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')

  // Check if it's the service_role key (from pg_cron)
  if (token === process.env.SUPABASE_SERVICE_ROLE_KEY) return 'service_role'

  // Otherwise verify as admin user
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()
  if (!profile || !isAdminOrAbove(profile.role)) return null
  return profile.company_id
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get integration(s) to sync
  let query = supabaseAdmin
    .from('meta_integrations')
    .select('*')
    .eq('is_active', true)

  if (auth !== 'service_role') {
    query = query.eq('company_id', auth)
  }

  const { data: integrations } = await query

  if (!integrations || integrations.length === 0) {
    return NextResponse.json({ message: 'No active integrations' })
  }

  for (const integration of integrations) {
    // Check if enough time has passed based on sync_frequency
    if (integration.last_synced_at) {
      const intervals: Record<string, number> = {
        '15min': 15, '30min': 30, '1hour': 60, '6hour': 360, '24hour': 1440,
      }
      const minutesSince = (Date.now() - new Date(integration.last_synced_at).getTime()) / 60000
      if (minutesSince < (intervals[integration.sync_frequency] || 60)) continue
    }

    if (!integration.access_token_encrypted || !integration.ad_account_id) continue

    // Set syncing status
    await supabaseAdmin
      .from('meta_integrations')
      .update({ sync_status: 'syncing', sync_error: null })
      .eq('id', integration.id)

    try {
      const accessToken = decrypt(integration.access_token_encrypted)
      const campaignFilter = integration.campaign_filter?.include || null

      // Fetch campaigns
      const campaignsRes = await metaApiGet<{ data: Array<Record<string, unknown>> }>(
        `/${integration.ad_account_id}/campaigns`,
        { fields: 'id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time', limit: '500' },
        { accessToken }
      )

      for (const campaign of campaignsRes.data) {
        const metaCampaignId = campaign.id as string
        if (campaignFilter && !campaignFilter.includes(metaCampaignId)) continue

        // Get campaign insights
        let campaignInsights: Record<string, unknown> = {}
        try {
          const insightsRes = await metaApiGet<{ data: Array<Record<string, unknown>> }>(
            `/${metaCampaignId}/insights`,
            { fields: 'spend,impressions,clicks,ctr,cpm,cost_per_action_type,actions', date_preset: 'lifetime' },
            { accessToken }
          )
          campaignInsights = insightsRes.data?.[0] || {}
        } catch { /* no insights available */ }

        const conversions = ((campaignInsights.actions as Array<{ action_type: string; value: string }>) || [])
          .filter(a => a.action_type === 'offsite_conversion')
          .reduce((sum, a) => sum + parseInt(a.value, 10), 0)

        const cpaValues = ((campaignInsights.cost_per_action_type as Array<{ action_type: string; value: string }>) || [])
          .filter(a => a.action_type === 'offsite_conversion')
        const cpa = cpaValues.length > 0 ? parseFloat(cpaValues[0].value) : null

        // Upsert campaign
        const { data: upsertedCampaign } = await supabaseAdmin
          .from('meta_campaigns')
          .upsert({
            integration_id: integration.id,
            meta_campaign_id: metaCampaignId,
            name: campaign.name as string,
            status: campaign.status as string,
            objective: campaign.objective as string,
            daily_budget: campaign.daily_budget ? Number(campaign.daily_budget) / 100 : null,
            lifetime_budget: campaign.lifetime_budget ? Number(campaign.lifetime_budget) / 100 : null,
            spend: parseFloat((campaignInsights.spend as string) || '0'),
            impressions: parseInt((campaignInsights.impressions as string) || '0', 10),
            clicks: parseInt((campaignInsights.clicks as string) || '0', 10),
            ctr: campaignInsights.ctr ? parseFloat(campaignInsights.ctr as string) : null,
            cpm: campaignInsights.cpm ? parseFloat(campaignInsights.cpm as string) : null,
            cpa,
            conversions,
            start_time: campaign.start_time as string || null,
            stop_time: campaign.stop_time as string || null,
            synced_at: new Date().toISOString(),
          }, { onConflict: 'integration_id,meta_campaign_id' })
          .select('id')
          .single()

        if (!upsertedCampaign) continue

        // Fetch ad sets for this campaign
        const adSetsRes = await metaApiGet<{ data: Array<Record<string, unknown>> }>(
          `/${metaCampaignId}/adsets`,
          { fields: 'id,name,status,targeting,daily_budget,lifetime_budget', limit: '500' },
          { accessToken }
        )

        for (const adSet of adSetsRes.data) {
          const metaAdSetId = adSet.id as string

          let adSetInsights: Record<string, unknown> = {}
          try {
            const insRes = await metaApiGet<{ data: Array<Record<string, unknown>> }>(
              `/${metaAdSetId}/insights`,
              { fields: 'spend,impressions,clicks,ctr,cpm,cost_per_action_type,actions', date_preset: 'lifetime' },
              { accessToken }
            )
            adSetInsights = insRes.data?.[0] || {}
          } catch { /* no insights */ }

          const adSetConversions = ((adSetInsights.actions as Array<{ action_type: string; value: string }>) || [])
            .filter(a => a.action_type === 'offsite_conversion')
            .reduce((sum, a) => sum + parseInt(a.value, 10), 0)

          const adSetCpaValues = ((adSetInsights.cost_per_action_type as Array<{ action_type: string; value: string }>) || [])
            .filter(a => a.action_type === 'offsite_conversion')
          const adSetCpa = adSetCpaValues.length > 0 ? parseFloat(adSetCpaValues[0].value) : null

          const { data: upsertedAdSet } = await supabaseAdmin
            .from('meta_ad_sets')
            .upsert({
              campaign_id: upsertedCampaign.id,
              meta_ad_set_id: metaAdSetId,
              name: adSet.name as string,
              status: adSet.status as string,
              targeting: adSet.targeting as Record<string, unknown> || null,
              daily_budget: adSet.daily_budget ? Number(adSet.daily_budget) / 100 : null,
              lifetime_budget: adSet.lifetime_budget ? Number(adSet.lifetime_budget) / 100 : null,
              spend: parseFloat((adSetInsights.spend as string) || '0'),
              impressions: parseInt((adSetInsights.impressions as string) || '0', 10),
              clicks: parseInt((adSetInsights.clicks as string) || '0', 10),
              ctr: adSetInsights.ctr ? parseFloat(adSetInsights.ctr as string) : null,
              cpm: adSetInsights.cpm ? parseFloat(adSetInsights.cpm as string) : null,
              cpa: adSetCpa,
              conversions: adSetConversions,
              synced_at: new Date().toISOString(),
            }, { onConflict: 'campaign_id,meta_ad_set_id' })
            .select('id')
            .single()

          if (!upsertedAdSet) continue

          // Fetch ads for this ad set
          const adsRes = await metaApiGet<{ data: Array<Record<string, unknown>> }>(
            `/${metaAdSetId}/ads`,
            { fields: 'id,name,status,creative{id,thumbnail_url,body,title,link_url}', limit: '500' },
            { accessToken }
          )

          for (const ad of adsRes.data) {
            const metaAdId = ad.id as string

            let adInsights: Record<string, unknown> = {}
            try {
              const insRes = await metaApiGet<{ data: Array<Record<string, unknown>> }>(
                `/${metaAdId}/insights`,
                { fields: 'spend,impressions,clicks,ctr,cpm,cost_per_action_type,actions,video_p25_watched_actions,quality_ranking,engagement_rate_ranking,conversion_rate_ranking', date_preset: 'lifetime' },
                { accessToken }
              )
              adInsights = insRes.data?.[0] || {}
            } catch { /* no insights */ }

            const creative = ad.creative as Record<string, unknown> || {}
            const adConversions = ((adInsights.actions as Array<{ action_type: string; value: string }>) || [])
              .filter(a => a.action_type === 'offsite_conversion')
              .reduce((sum, a) => sum + parseInt(a.value, 10), 0)

            const adCpaValues = ((adInsights.cost_per_action_type as Array<{ action_type: string; value: string }>) || [])
              .filter(a => a.action_type === 'offsite_conversion')
            const adCpa = adCpaValues.length > 0 ? parseFloat(adCpaValues[0].value) : null

            // Compute hook rate: video_p25_watched_actions / impressions * 100
            const videoViews = ((adInsights.video_p25_watched_actions as Array<{ value: string }>) || [])
            const impressions = parseInt((adInsights.impressions as string) || '0', 10)
            const hookRate = videoViews.length > 0 && impressions > 0
              ? (parseInt(videoViews[0].value, 10) / impressions) * 100
              : null

            // Compute EMQ score
            const emqScore = adInsights.quality_ranking
              ? computeEmqScore(
                  adInsights.quality_ranking as string,
                  adInsights.engagement_rate_ranking as string,
                  adInsights.conversion_rate_ranking as string
                )
              : null

            await supabaseAdmin
              .from('meta_ads')
              .upsert({
                ad_set_id: upsertedAdSet.id,
                meta_ad_id: metaAdId,
                name: ad.name as string,
                status: ad.status as string,
                creative_id: creative.id as string || null,
                creative_thumbnail_url: creative.thumbnail_url as string || null,
                creative_body: creative.body as string || null,
                creative_title: creative.title as string || null,
                creative_link_url: creative.link_url as string || null,
                hook_rate: hookRate,
                ctr: adInsights.ctr ? parseFloat(adInsights.ctr as string) : null,
                cpm: adInsights.cpm ? parseFloat(adInsights.cpm as string) : null,
                cpa: adCpa,
                spend: parseFloat((adInsights.spend as string) || '0'),
                impressions,
                clicks: parseInt((adInsights.clicks as string) || '0', 10),
                conversions: adConversions,
                emq_score: emqScore,
                synced_at: new Date().toISOString(),
              }, { onConflict: 'ad_set_id,meta_ad_id' })
          }
        }
      }

      // Mark sync complete
      await supabaseAdmin
        .from('meta_integrations')
        .update({ sync_status: 'idle', last_synced_at: new Date().toISOString() })
        .eq('id', integration.id)

    } catch (err) {
      await supabaseAdmin
        .from('meta_integrations')
        .update({
          sync_status: 'error',
          sync_error: (err as Error).message || 'Unknown sync error',
        })
        .eq('id', integration.id)
    }
  }

  return NextResponse.json({ success: true })
}
