'use client'

import Image from 'next/image'
import { PlacementPreviewProps, ctaLabel, hostFromUrl } from './types'

export function FacebookRightColumnPreview({ ad }: PlacementPreviewProps) {
  const cta = ctaLabel(null)
  const host = hostFromUrl(ad.creative_link_url)

  return (
    <div className="mx-auto" style={{ width: 254 }}>
      <div className="text-[11px] font-semibold text-gray-500 mb-1">Sponsored</div>
      <div className="rounded-md border bg-white overflow-hidden shadow-sm">
        <div className="relative w-full bg-gray-100" style={{ aspectRatio: '4 / 3' }}>
          {ad.creative_thumbnail_url ? (
            <Image
              src={ad.creative_thumbnail_url}
              alt={ad.creative_title || ad.name}
              fill
              sizes="254px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-xs">
              No creative
            </div>
          )}
        </div>
        <div className="p-2">
          <div className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">
            {ad.creative_title || ad.name}
          </div>
          <div className="text-[11px] uppercase tracking-wide text-gray-500 mt-1 truncate">
            {host}
          </div>
          {ad.creative_body && (
            <div className="text-xs text-gray-700 mt-1 line-clamp-2">{ad.creative_body}</div>
          )}
          <button className="mt-2 w-full rounded-md bg-blue-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
            {cta}
          </button>
        </div>
      </div>
    </div>
  )
}
