'use client'

import Image from 'next/image'
import { OverflowMenuVertical, Close, ArrowUp } from '@carbon/icons-react'
import { PlacementPreviewProps, ctaLabel } from './types'

export function InstagramStoryPreview({ ad, pageName = 'your.brand' }: PlacementPreviewProps) {
  const cta = ctaLabel(null)

  return (
    <div
      className="mx-auto relative rounded-2xl overflow-hidden shadow-sm bg-black font-sans"
      style={{ width: 320, aspectRatio: '9 / 16' }}
    >
      {/* Creative as background */}
      {ad.creative_thumbnail_url ? (
        <Image
          src={ad.creative_thumbnail_url}
          alt={ad.creative_title || ad.name}
          fill
          sizes="320px"
          className="object-cover"
          unoptimized
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm bg-gray-900">
          No creative image
        </div>
      )}

      {/* Top progress bar */}
      <div className="absolute top-2 left-2 right-2 h-[3px] bg-white/30 rounded-full overflow-hidden">
        <div className="h-full w-1/3 bg-white rounded-full" />
      </div>

      {/* Top header */}
      <div className="absolute top-4 left-3 right-3 flex items-center gap-2 text-white">
        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-semibold">
          {pageName.charAt(0).toUpperCase()}
        </div>
        <span className="text-sm font-semibold drop-shadow">{pageName}</span>
        <span className="text-xs opacity-80">Sponsored</span>
        <div className="ml-auto flex items-center gap-2">
          <OverflowMenuVertical size={18} />
          <Close size={18} />
        </div>
      </div>

      {/* Bottom text overlay */}
      {ad.creative_body && (
        <div className="absolute left-3 right-3 bottom-24 rounded-lg bg-black/40 px-3 py-2 text-white text-sm leading-snug">
          {ad.creative_body}
        </div>
      )}

      {/* Swipe-up CTA */}
      <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center text-white">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mb-1 animate-pulse">
          <ArrowUp size={20} />
        </div>
        <div className="text-sm font-semibold">{cta}</div>
      </div>
    </div>
  )
}
