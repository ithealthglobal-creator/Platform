'use client'

import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { Roadmap, CheckmarkOutline } from '@carbon/icons-react'

interface JourneyEmptyStateProps {
  type: 'no-assessment' | 'all-above-threshold'
}

export function JourneyEmptyState({ type }: JourneyEmptyStateProps) {
  const router = useRouter()

  if (type === 'all-above-threshold') {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-16 text-center">
        <CheckmarkOutline size={48} className="mb-4 text-brand-primary" />
        <h2 className="text-lg font-semibold text-brand-dark">
          Outstanding IT Maturity
        </h2>
        <p className="mt-2 max-w-md text-sm text-slate-500">
          Your IT maturity scores are above the threshold across all services.
          Great work!
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-16 text-center">
      <Roadmap size={48} className="mb-4 text-brand-primary/40" />
      <h2 className="text-lg font-semibold text-brand-dark">
        No Journey Data Yet
      </h2>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        Complete your IT Modernisation Assessment to see your personalised
        implementation journey.
      </p>
      <Button
        className="mt-6 bg-brand-primary hover:bg-brand-primary/90"
        onClick={() => router.push('/portal/home')}
      >
        Go to Assessment
      </Button>
    </div>
  )
}
