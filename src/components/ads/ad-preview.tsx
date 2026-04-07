// src/components/ads/ad-preview.tsx
'use client'

interface AdPreviewProps {
  primaryText: string
  headline: string
  imageUrl: string | null
  linkUrl: string
  callToAction: string
}

const CTA_LABELS: Record<string, string> = {
  SHOP_NOW: 'Shop Now',
  LEARN_MORE: 'Learn More',
  SIGN_UP: 'Sign Up',
  GET_OFFER: 'Get Offer',
  BOOK_TRAVEL: 'Book Travel',
  CONTACT_US: 'Contact Us',
  DOWNLOAD: 'Download',
  GET_QUOTE: 'Get Quote',
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url || 'example.com'
  }
}

export default function AdPreview({ primaryText, headline, imageUrl, linkUrl, callToAction }: AdPreviewProps) {
  return (
    <div className="border rounded-lg bg-white overflow-hidden max-w-[400px]">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
          YB
        </div>
        <div>
          <div className="text-sm font-medium">Your Brand</div>
          <div className="text-xs text-muted-foreground">Sponsored</div>
        </div>
      </div>

      {/* Primary text */}
      <div className="px-4 pb-2 text-sm">
        {primaryText || <span className="text-muted-foreground italic">Your ad text will appear here...</span>}
      </div>

      {/* Image */}
      <div className="aspect-video bg-muted flex items-center justify-center">
        {imageUrl ? (
          <img src={imageUrl} alt="Ad preview" className="w-full h-full object-cover" />
        ) : (
          <span className="text-sm text-muted-foreground">Image preview</span>
        )}
      </div>

      {/* Link bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t">
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted-foreground uppercase truncate">
            {extractDomain(linkUrl)}
          </div>
          <div className="text-sm font-medium truncate">
            {headline || <span className="text-muted-foreground italic">Headline</span>}
          </div>
        </div>
        <button
          type="button"
          className="ml-3 px-3 py-1.5 bg-gray-200 text-sm font-medium rounded-md whitespace-nowrap"
        >
          {CTA_LABELS[callToAction] || 'Learn More'}
        </button>
      </div>
    </div>
  )
}
