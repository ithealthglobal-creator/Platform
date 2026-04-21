'use client'

import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function CustomerGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && (!profile || profile.role !== 'customer')) {
      router.replace('/login')
    }
  }, [loading, profile, router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
      </div>
    )
  }

  if (!profile || profile.role !== 'customer') {
    return null
  }

  return <>{children}</>
}
