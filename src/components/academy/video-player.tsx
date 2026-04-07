'use client'

interface VideoPlayerProps {
  youtubeUrl: string
  title: string
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

export function VideoPlayer({ youtubeUrl, title }: VideoPlayerProps) {
  // Video completion is tracked at the page level via Next button clicks
  const videoId = extractYouTubeId(youtubeUrl)

  if (!videoId) {
    return (
      <div
        className="bg-slate-100 aspect-video flex items-center justify-center text-slate-500 text-sm"
        style={{ borderRadius: '16px 0 16px 16px' }}
      >
        Invalid video URL
      </div>
    )
  }

  return (
    <div style={{ borderRadius: '16px 0 16px 16px', overflow: 'hidden' }}>
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        title={title}
        className="w-full aspect-video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}
