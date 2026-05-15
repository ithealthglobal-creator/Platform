'use client'

import Image from 'next/image'
import { OverflowMenuVertical, Close } from '@carbon/icons-react'
import { PlacementPreviewProps, ctaLabel, hostFromUrl } from './types'

export function AudienceNetworkPreview({ ad, pageName = 'Your Brand' }: PlacementPreviewProps) {
  const cta = ctaLabel(null)
  const host = hostFromUrl(ad.creative_link_url)

  return (
    <div className="mx-auto" style={{ width: 360 }}>
      <div className="text-[11px] text-gray-500 mb-1 px-1">Publisher article · Audience Network ad</div>
      <div className="rounded-lg border bg-white overflow-hidden shadow-sm">
        {/* Mini publisher chrome */}
        <div className="flex items-center justify-between px-3 py-2 border-b text-[11px] text-gray-500">
          <span>news.example.com</span>
          <span>Ad</span>
        </div>

        {/* Ad block */}
        <div className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-[10px] font-semibold text-gray-700">
              {pageName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-gray-900 truncate">{pageName}</div>
              <div className="text-[10px] text-gray-500">Sponsored</div>
            </div>
            <OverflowMenuVertical size={16} className="text-gray-500" />
            <Close size={16} className="text-gray-500" />
          </div>

          {ad.creative_body && (
            <div className="text-xs text-gray-800 mb-2 line-clamp-3">{ad.creative_body}</div>
          )}

          <div className="relative w-full bg-gray-100 rounded-md overflow-hidden" style={{ aspectRatio: '16 / 9' }}>
            {ad.creative_thumbnail_url ? (
              <Image
                src={ad.creative_thumbnail_url}
                alt={ad.creative_title || ad.name}
                fill
                sizes="360px"
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-xs">
                No creative
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-2">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] uppercase tracking-wide text-gray-500 truncate">{host}</div>
              <div className="text-sm font-semibold text-gray-900 truncate">
                {ad.creative_title || ad.name}
              </div>
            </div>
            <button className="ml-2 shrink-0 rounded-md bg-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-900 hover:bg-gray-300">
              {cta}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
