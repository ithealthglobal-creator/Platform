'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdsRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/growth/campaigns')
  }, [router])
  return null
}
