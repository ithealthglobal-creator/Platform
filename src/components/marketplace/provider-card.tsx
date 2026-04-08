'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Building } from '@carbon/icons-react'

interface ProviderCardProps {
  name: string
  slug: string
  logoUrl?: string | null
  tagline?: string | null
  serviceCount?: number
  domain?: string | null
}

export function ProviderCard({ name, slug, logoUrl, tagline, serviceCount, domain }: ProviderCardProps) {
  return (
    <Link
      href={`/marketplace/providers/${slug}`}
      className="group flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6 hover:border-gray-300 hover:shadow-md transition-all duration-200"
    >
      {/* Logo */}
      <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-gray-50 border border-gray-100">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt={`${name} logo`}
            width={40}
            height={40}
            className="h-10 w-10 object-contain"
          />
        ) : (
          <Building size={24} className="text-gray-400" />
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-1 flex-1">
        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
          {name}
        </h3>
        {tagline && (
          <p className="text-sm text-gray-500 line-clamp-2">{tagline}</p>
        )}
        {domain && (
          <p className="text-xs text-gray-400 mt-1">{domain}</p>
        )}
      </div>

      {/* Footer */}
      {serviceCount !== undefined && (
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
            {serviceCount} {serviceCount === 1 ? 'service' : 'services'}
          </span>
        </div>
      )}
    </Link>
  )
}
