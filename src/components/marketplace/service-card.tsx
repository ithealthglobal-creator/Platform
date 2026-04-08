'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Building } from '@carbon/icons-react'

interface ServiceCardProps {
  name: string
  description?: string | null
  phaseName: string
  phaseColor: string
  providerName: string
  providerSlug: string
  providerLogoUrl?: string | null
}

const phaseColorMap: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700',
  pink: 'bg-pink-100 text-pink-700',
  navy: 'bg-slate-100 text-slate-700',
  gold: 'bg-amber-100 text-amber-700',
}

export function ServiceCard({
  name,
  description,
  phaseName,
  phaseColor,
  providerName,
  providerSlug,
  providerLogoUrl,
}: ServiceCardProps) {
  const badgeClass = phaseColorMap[phaseColor] ?? 'bg-gray-100 text-gray-700'

  return (
    <Link
      href={`/marketplace/providers/${providerSlug}`}
      className="group flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6 hover:border-gray-300 hover:shadow-md transition-all duration-200"
    >
      {/* Phase badge */}
      <div>
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass}`}>
          {phaseName}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-1 flex-1">
        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
          {name}
        </h3>
        {description && (
          <p className="text-sm text-gray-500 line-clamp-3">{description}</p>
        )}
      </div>

      {/* Provider footer */}
      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100">
          {providerLogoUrl ? (
            <Image
              src={providerLogoUrl}
              alt={`${providerName} logo`}
              width={16}
              height={16}
              className="h-4 w-4 object-contain rounded-full"
            />
          ) : (
            <Building size={12} className="text-gray-400" />
          )}
        </div>
        <span className="text-xs text-gray-500">{providerName}</span>
      </div>
    </Link>
  )
}
