// src/app/(admin)/growth/campaigns/[campaignId]/create-ad-set/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { MetaCampaign } from '@/lib/types'
import { toast } from 'sonner'
import AdSetForm, { AdSetFormData } from '@/components/ads/ad-set-form'
import AdForm, { AdFormData } from '@/components/ads/ad-form'

const STEPS = ['Ad Set', 'Ad']

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

export default function CreateAdSetWizardPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const campaignId = params.campaignId as string
  const editId = searchParams.get('edit')
  const isEdit = !!editId
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [campaign, setCampaign] = useState<MetaCampaign | null>(null)
  const [adSetData, setAdSetData] = useState<AdSetFormData | null>(null)
  const [initialAdSetData, setInitialAdSetData] = useState<Partial<AdSetFormData> | undefined>()

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('meta_campaigns').select('*').eq('id', campaignId).single()
      if (data) setCampaign(data)

      if (editId) {
        const { data: adSet } = await supabase.from('meta_ad_sets').select('*').eq('id', editId).single()
        if (adSet) {
          setInitialAdSetData({
            name: adSet.name,
            daily_budget: adSet.daily_budget || '',
            lifetime_budget: adSet.lifetime_budget || '',
            age_min: adSet.targeting?.age_min as number || 18,
            age_max: adSet.targeting?.age_max as number || 65,
          })
        }
      }
    }
    load()
  }, [campaignId, editId])

  const getAuthHeaders = async () => {
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  }

  const handleAdSetSubmit = async (data: AdSetFormData) => {
    if (isEdit) {
      setSubmitting(true)
      try {
        const headers = await getAuthHeaders()
        const targeting: Record<string, unknown> = {
          geo_locations: {
            countries: data.locations.map(l => l.country_code || l.key || l.name),
          },
          age_min: data.age_min,
          age_max: data.age_max,
        }
        if (data.interests.length > 0) {
          targeting.flexible_spec = [{ interests: data.interests.map(i => ({ id: i.id, name: i.name })) }]
        }
        if (data.genders.length > 0) targeting.genders = data.genders

        const body: Record<string, unknown> = { name: data.name, targeting }
        if (data.daily_budget) body.daily_budget = Number(data.daily_budget) * 100
        if (data.lifetime_budget) body.lifetime_budget = Number(data.lifetime_budget) * 100

        const res = await fetch(`/api/admin/ads/meta/ad-sets/${editId}/update`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const { error } = await res.json()
          toast.error(error || 'Failed to update ad set')
          return
        }
        toast.success('Ad set updated')
        router.push(`/growth/campaigns/${campaignId}`)
      } catch {
        toast.error('Failed to update ad set')
      } finally {
        setSubmitting(false)
      }
      return
    }

    setAdSetData(data)
    setStep(1)
  }

  const handleAdSubmit = async (adData: AdFormData) => {
    if (!adSetData) return
    setSubmitting(true)

    try {
      const headers = await getAuthHeaders()

      // Create ad set
      const targeting: Record<string, unknown> = {
        geo_locations: {
          countries: adSetData.locations.map(l => l.country_code || l.key || l.name),
        },
        age_min: adSetData.age_min,
        age_max: adSetData.age_max,
      }
      if (adSetData.interests.length > 0) {
        targeting.flexible_spec = [{ interests: adSetData.interests.map(i => ({ id: i.id, name: i.name })) }]
      }
      if (adSetData.genders.length > 0) targeting.genders = adSetData.genders

      const adSetBody: Record<string, unknown> = {
        campaign_id: campaignId,
        name: adSetData.name,
        targeting,
      }
      if (adSetData.daily_budget) adSetBody.daily_budget = Number(adSetData.daily_budget) * 100
      if (adSetData.lifetime_budget) adSetBody.lifetime_budget = Number(adSetData.lifetime_budget) * 100
      if (adSetData.optimization_goal) adSetBody.optimization_goal = adSetData.optimization_goal

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

      // Create ad
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

      toast.success('Ad set and ad created successfully')
      router.push(`/growth/campaigns/${campaignId}`)
    } catch {
      toast.error('An error occurred during creation')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">
        {isEdit ? 'Edit Ad Set' : 'Add Ad Set'}
      </h1>
      <p className="text-muted-foreground mb-6">
        {campaign ? `For campaign: ${campaign.name}` : 'Loading...'}
      </p>

      {!isEdit && <ProgressBar currentStep={step} />}

      {step === 0 && (
        <AdSetForm
          initialData={initialAdSetData}
          onSubmit={handleAdSetSubmit}
          onCancel={() => router.push(`/growth/campaigns/${campaignId}`)}
          nextLabel={isEdit ? 'Save Changes' : 'Next: Ad'}
        />
      )}
      {step === 1 && (
        <div className={submitting ? 'pointer-events-none opacity-60' : ''}>
          <AdForm
            onSubmit={handleAdSubmit}
            onBack={() => setStep(0)}
            onCancel={() => router.push(`/growth/campaigns/${campaignId}`)}
            submitLabel={submitting ? 'Creating...' : 'Create Ad Set'}
          />
        </div>
      )}
    </div>
  )
}
