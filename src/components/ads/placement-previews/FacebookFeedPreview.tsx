'use client'

import Image from 'next/image'
import { OverflowMenuVertical, Close, ThumbsUp, Chat, Share } from '@carbon/icons-react'
import { PlacementPreviewProps, ctaLabel, hostFromUrl } from './types'

export function FacebookFeedPreview({ ad, pageName = 'Your Page' }: PlacementPreviewProps) {
  const cta = ctaLabel(null)
  const host = hostFromUrl(ad.creative_link_url)

  return (
    <div className="mx-auto max-w-[500px] rounded-lg border bg-white shadow-sm overflow-hidden font-sans">
      {/* Header */}
      <div className="flex items-center gap-3 p-3">
        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
          {pageName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-900 truncate">{pageName}</div>
          <div className="text-xs text-gray-500">Sponsored · <span aria-hidden>🌐</span></div>
        </div>
        <OverflowMenuVertical size={20} className="text-gray-500" />
        <Close size={20} className="text-gray-500" />
      </div>

      {/* Body text */}
      {ad.creative_body && (
        <div className="px-3 pb-2 text-sm text-gray-800 whitespace-pre-line">{ad.creative_body}</div>
      )}

      {/* Creative */}
      <div className="relative w-full bg-gray-100" style={{ aspectRatio: '1 / 1' }}>
        {ad.creative_thumbnail_url ? (
          <Image
            src={ad.creative_thumbnail_url}
            alt={ad.creative_title || ad.name}
            fill
            sizes="500px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
            No creative image
          </div>
        )}
      </div>

      {/* Link card */}
      <div className="flex items-center justify-between border-t bg-gray-50 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wide text-gray-500 truncate">{host}</div>
          <div className="text-sm font-semibold text-gray-900 truncate">
            {ad.creative_title || ad.name}
          </div>
        </div>
        <button className="ml-3 shrink-0 rounded-md bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-900 hover:bg-gray-300">
          {cta}
        </button>
      </div>

      {/* Reactions */}
      <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="text-blue-600">👍</span> 1.2K</span>
        <span>134 comments · 42 shares</span>
      </div>
      <div className="grid grid-cols-3 border-t text-sm text-gray-600">
        <button className="flex items-center justify-center gap-2 py-2 hover:bg-gray-50">
          <ThumbsUp size={16} /> Like
        </button>
        <button className="flex items-center justify-center gap-2 py-2 hover:bg-gray-50">
          <Chat size={16} /> Comment
        </button>
        <button className="flex items-center justify-center gap-2 py-2 hover:bg-gray-50">
          <Share size={16} /> Share
        </button>
      </div>
    </div>
  )
}
