'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function AdSetRedirectPage() {
  const router = useRouter()
  const params = useParams()
  const campaignId = params.campaignId as string
  useEffect(() => {
    router.replace(`/growth/campaigns/${campaignId}`)
  }, [router, campaignId])
  return null
}
