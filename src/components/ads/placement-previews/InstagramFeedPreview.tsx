'use client'

import Image from 'next/image'
import { OverflowMenuVertical, Favorite, Chat, Send } from '@carbon/icons-react'
import { PlacementPreviewProps, ctaLabel } from './types'

export function InstagramFeedPreview({ ad, pageName = 'your.brand' }: PlacementPreviewProps) {
  const cta = ctaLabel(null)

  return (
    <div className="mx-auto max-w-[420px] rounded-lg border bg-white shadow-sm overflow-hidden font-sans">
      {/* Header */}
      <div className="flex items-center gap-3 p-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
          <div className="w-full h-full rounded-full bg-white p-[2px]">
            <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-semibold text-gray-700">
              {pageName.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-900 truncate">{pageName}</div>
          <div className="text-[11px] text-gray-500">Sponsored</div>
        </div>
        <OverflowMenuVertical size={20} className="text-gray-700" />
      </div>

      {/* Creative */}
      <div className="relative w-full bg-gray-100" style={{ aspectRatio: '1 / 1' }}>
        {ad.creative_thumbnail_url ? (
          <Image
            src={ad.creative_thumbnail_url}
            alt={ad.creative_title || ad.name}
            fill
            sizes="420px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
            No creative image
          </div>
        )}
      </div>

      {/* CTA bar */}
      <div className="flex items-center justify-between border-y bg-white px-3 py-2">
        <span className="text-sm font-medium text-gray-900">{ad.creative_title || ad.name}</span>
        <span className="text-sm font-semibold text-blue-600">{cta} ›</span>
      </div>

      {/* Action row */}
      <div className="flex items-center gap-4 px-3 pt-3 text-gray-800">
        <Favorite size={22} />
        <Chat size={22} />
        <Send size={22} />
      </div>

      {/* Likes + caption */}
      <div className="px-3 py-2 text-sm text-gray-900">
        <div className="font-semibold">2,481 likes</div>
        {ad.creative_body && (
          <div className="mt-1">
            <span className="font-semibold mr-1">{pageName}</span>
            <span className="whitespace-pre-line">{ad.creative_body}</span>
          </div>
        )}
      </div>
    </div>
  )
}
