// src/app/(admin)/growth/ads/create/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { toast } from 'sonner'
import CampaignForm, { CampaignFormData } from '@/components/ads/campaign-form'
import AdSetForm, { AdSetFormData } from '@/components/ads/ad-set-form'
import AdForm, { AdFormData } from '@/components/ads/ad-form'

const STEPS = ['Campaign', 'Ad Set', 'Ad']

function ProgressBar({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-2 flex-1">
          <div className={`flex items-center gap-2 ${i <= currentStep ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
              i < currentStep ? 'bg-primary text-white border-primary'
                : i === currentStep ? 'border-primary text-primary'
                : 'border-muted-foreground/30 text-muted-foreground'
            }`}>
              {i + 1}
            </div>
            <span className="text-sm font-medium">{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 ${i < currentStep ? 'bg-primary' : 'bg-muted'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function CreateWizardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')
  const isEdit = !!editId
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [campaignData, setCampaignData] = useState<CampaignFormData | null>(null)
  const [adSetData, setAdSetData] = useState<AdSetFormData | null>(null)
  const [createdCampaignId, setCreatedCampaignId] = useState<string | null>(null)
  const [createdAdSetId, setCreatedAdSetId] = useState<string | null>(null)

  // Load existing data for edit mode
  const [initialCampaignData, setInitialCampaignData] = useState<Partial<CampaignFormData> | undefined>()

  useEffect(() => {
    if (editId) {
      const loadCampaign = async () => {
        const { data } = await supabase
          .from('meta_campaigns')
          .select('*')
          .eq('id', editId)
          .single()
        if (data) {
          setInitialCampaignData({
            name: data.name,
            objective: data.objective || '',
            daily_budget: data.daily_budget ? data.daily_budget : '',
            status: data.status || 'PAUSED',
            lifetime_budget: data.lifetime_budget ? data.lifetime_budget : '',
            start_time: data.start_time || '',
            stop_time: data.stop_time || '',
          })
        }
      }
      loadCampaign()
    }
  }, [editId])

  const getAuthHeaders = async () => {
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  }

  const handleCampaignSubmit = async (data: CampaignFormData) => {
    if (isEdit) {
      // Update existing campaign
      setSubmitting(true)
      try {
        const headers = await getAuthHeaders()
        const body: Record<string, unknown> = { name: data.name, objective: data.objective }
        if (data.daily_budget) body.daily_budget = Number(data.daily_budget) * 100
        if (data.lifetime_budget) body.lifetime_budget = Number(data.lifetime_budget) * 100
        if (data.bid_strategy) body.bid_strategy = data.bid_strategy
        if (data.start_time) body.start_time = new Date(data.start_time).toISOString()
        if (data.stop_time) body.stop_time = new Date(data.stop_time).toISOString()
        if (data.special_ad_categories.length > 0) body.special_ad_categories = data.special_ad_categories

        const res = await fetch(`/api/admin/ads/meta/campaigns/${editId}/update`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const { error } = await res.json()
          toast.error(error || 'Failed to update campaign')
          return
        }
        toast.success('Campaign updated')
        router.push('/growth/ads')
      } catch {
        toast.error('Failed to update campaign')
      } finally {
        setSubmitting(false)
      }
      return
    }

    setCampaignData(data)
    setStep(1)
  }

  const handleAdSetSubmit = (data: AdSetFormData) => {
    setAdSetData(data)
    setStep(2)
  }

  const handleAdSubmit = async (adData: AdFormData) => {
    if (!campaignData || !adSetData) return
    setSubmitting(true)

    try {
      const headers = await getAuthHeaders()

      // Step 1: Create campaign
      const campaignBody: Record<string, unknown> = {
        name: campaignData.name,
        objective: campaignData.objective,
        status: campaignData.status,
        special_ad_categories: campaignData.special_ad_categories,
      }
      if (campaignData.daily_budget) campaignBody.daily_budget = Number(campaignData.daily_budget) * 100
      if (campaignData.lifetime_budget) campaignBody.lifetime_budget = Number(campaignData.lifetime_budget) * 100
      if (campaignData.bid_strategy) campaignBody.bid_strategy = campaignData.bid_strategy
      if (campaignData.start_time) campaignBody.start_time = new Date(campaignData.start_time).toISOString()
      if (campaignData.stop_time) campaignBody.stop_time = new Date(campaignData.stop_time).toISOString()

      const campaignRes = await fetch('/api/admin/ads/meta/campaigns/create', {
        method: 'POST',
        headers,
        body: JSON.stringify(campaignBody),
      })
      if (!campaignRes.ok) {
        const { error } = await campaignRes.json()
        toast.error(error || 'Failed to create campaign')
        setSubmitting(false)
        return
      }
      const { campaign } = await campaignRes.json()
      setCreatedCampaignId(campaign.id)

      // Step 2: Create ad set
      const targeting: Record<string, unknown> = {
        geo_locations: {
          countries: adSetData.locations
            .filter(l => l.type === 'country' || l.country_code)
            .map(l => l.country_code || l.key || l.name),
        },
        age_min: adSetData.age_min,
        age_max: adSetData.age_max,
      }
      if (adSetData.interests.length > 0) {
        targeting.flexible_spec = [{ interests: adSetData.interests.map(i => ({ id: i.id, name: i.name })) }]
      }
      if (adSetData.genders.length > 0) targeting.genders = adSetData.genders
      if (adSetData.publisher_platforms.length > 0) targeting.publisher_platforms = adSetData.publisher_platforms

      const adSetBody: Record<string, unknown> = {
        campaign_id: campaign.id,
        name: adSetData.name,
        targeting,
      }
      if (adSetData.daily_budget) adSetBody.daily_budget = Number(adSetData.daily_budget) * 100
      if (adSetData.lifetime_budget) adSetBody.lifetime_budget = Number(adSetData.lifetime_budget) * 100
      if (adSetData.optimization_goal) adSetBody.optimization_goal = adSetData.optimization_goal
      if (adSetData.bid_amount) adSetBody.bid_amount = Number(adSetData.bid_amount)
      if (adSetData.start_time) adSetBody.start_time = new Date(adSetData.start_time).toISOString()
      if (adSetData.end_time) adSetBody.end_time = new Date(adSetData.end_time).toISOString()

      const adSetRes = await fetch('/api/admin/ads/meta/ad-sets/create', {
        method: 'POST',
        headers,
        body: JSON.stringify(adSetBody),
      })
      if (!adSetRes.ok) {
        const { error } = await adSetRes.json()
        toast.error(error || 'Failed to create ad set')
        setSubmitting(false)
        return
      }
      const { adSet } = await adSetRes.json()
      setCreatedAdSetId(adSet.id)

      // Step 3: Create ad
      const adBody: Record<string, unknown> = {
        ad_set_id: adSet.id,
        name: adData.name,
        image_hash: adData.image_hash,
        image_url: adData.image_url,
        primary_text: adData.primary_text,
        headline: adData.headline,
        link_url: adData.link_url,
        call_to_action: adData.call_to_action,
        status: adData.status || 'PAUSED',
      }
      if (adData.description) adBody.description = adData.description
      if (adData.display_link) adBody.display_link = adData.display_link
      if (adData.url_tags) adBody.url_tags = adData.url_tags

      const adRes = await fetch('/api/admin/ads/meta/ads/create', {
        method: 'POST',
        headers,
        body: JSON.stringify(adBody),
      })
      if (!adRes.ok) {
        const { error } = await adRes.json()
        toast.error(error || 'Failed to create ad')
        setSubmitting(false)
        return
      }

      toast.success('Campaign, ad set, and ad created successfully')
      router.push('/growth/ads')
    } catch {
      toast.error('An error occurred during creation')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">
        {isEdit ? 'Edit Campaign' : 'Create Campaign'}
      </h1>
      <p className="text-muted-foreground mb-6">
        {isEdit ? 'Update your campaign settings.' : 'Set up a new campaign with an ad set and ad.'}
      </p>

      {!isEdit && <ProgressBar currentStep={step} />}

      {step === 0 && (
        <CampaignForm
          initialData={initialCampaignData}
          onSubmit={handleCampaignSubmit}
          onCancel={() => router.push('/growth/ads')}
          nextLabel={isEdit ? 'Save Changes' : 'Next: Ad Set'}
        />
      )}
      {step === 1 && (
        <AdSetForm
          onSubmit={handleAdSetSubmit}
          onBack={() => setStep(0)}
          onCancel={() => router.push('/growth/ads')}
        />
      )}
      {step === 2 && (
        <div className={submitting ? 'pointer-events-none opacity-60' : ''}>
          <AdForm
            onSubmit={handleAdSubmit}
            onBack={() => setStep(1)}
            onCancel={() => router.push('/growth/ads')}
            submitLabel={submitting ? 'Creating...' : 'Create Campaign'}
          />
        </div>
      )}
    </div>
  )
}
