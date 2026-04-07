// src/app/(admin)/growth/ads/[campaignId]/[adSetId]/create-ad/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { MetaAdSet, MetaCampaign } from '@/lib/types'
import { toast } from 'sonner'
import AdForm, { AdFormData } from '@/components/ads/ad-form'

export default function CreateAdPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const campaignId = params.campaignId as string
  const adSetId = params.adSetId as string
  const editId = searchParams.get('edit')
  const isEdit = !!editId
  const [submitting, setSubmitting] = useState(false)
  const [campaign, setCampaign] = useState<MetaCampaign | null>(null)
  const [adSet, setAdSet] = useState<MetaAdSet | null>(null)
  const [initialAdData, setInitialAdData] = useState<Partial<AdFormData> | undefined>()

  useEffect(() => {
    const load = async () => {
      const [campaignRes, adSetRes] = await Promise.all([
        supabase.from('meta_campaigns').select('*').eq('id', campaignId).single(),
        supabase.from('meta_ad_sets').select('*').eq('id', adSetId).single(),
      ])
      if (campaignRes.data) setCampaign(campaignRes.data)
      if (adSetRes.data) setAdSet(adSetRes.data)

      if (editId) {
        const { data: ad } = await supabase.from('meta_ads').select('*').eq('id', editId).single()
        if (ad) {
          setInitialAdData({
            name: ad.name,
            primary_text: ad.creative_body || '',
            headline: ad.creative_title || '',
            link_url: ad.creative_link_url || '',
            image_url: ad.creative_thumbnail_url || '',
            image_hash: ad.creative_id || '',
          })
        }
      }
    }
    load()
  }, [campaignId, adSetId, editId])

  const handleSubmit = async (adData: AdFormData) => {
    setSubmitting(true)
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

      if (isEdit) {
        const body: Record<string, unknown> = {
          name: adData.name,
          primary_text: adData.primary_text,
          headline: adData.headline,
          link_url: adData.link_url,
          call_to_action: adData.call_to_action,
        }
        if (adData.image_hash) body.image_hash = adData.image_hash
        if (adData.image_url) body.image_url = adData.image_url
        if (adData.description) body.description = adData.description
        if (adData.display_link) body.display_link = adData.display_link
        if (adData.url_tags) body.url_tags = adData.url_tags

        const res = await fetch(`/api/admin/ads/meta/ads/${editId}/update`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const { error } = await res.json()
          toast.error(error || 'Failed to update ad')
          return
        }
        toast.success('Ad updated')
      } else {
        const body: Record<string, unknown> = {
          ad_set_id: adSetId,
          name: adData.name,
          image_hash: adData.image_hash,
          image_url: adData.image_url,
          primary_text: adData.primary_text,
          headline: adData.headline,
          link_url: adData.link_url,
          call_to_action: adData.call_to_action,
          status: adData.status || 'PAUSED',
        }
        if (adData.description) body.description = adData.description
        if (adData.display_link) body.display_link = adData.display_link
        if (adData.url_tags) body.url_tags = adData.url_tags

        const res = await fetch('/api/admin/ads/meta/ads/create', {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const { error } = await res.json()
          toast.error(error || 'Failed to create ad')
          return
        }
        toast.success('Ad created')
      }

      router.push(`/growth/ads/${campaignId}/${adSetId}`)
    } catch {
      toast.error('An error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">
        {isEdit ? 'Edit Ad' : 'Add Ad'}
      </h1>
      <p className="text-muted-foreground mb-6">
        {campaign && adSet ? `${campaign.name} > ${adSet.name}` : 'Loading...'}
      </p>

      <div className={submitting ? 'pointer-events-none opacity-60' : ''}>
        <AdForm
          initialData={initialAdData}
          onSubmit={handleSubmit}
          onCancel={() => router.push(`/growth/ads/${campaignId}/${adSetId}`)}
          submitLabel={submitting ? (isEdit ? 'Saving...' : 'Creating...') : (isEdit ? 'Save Changes' : 'Create Ad')}
        />
      </div>
    </div>
  )
}
