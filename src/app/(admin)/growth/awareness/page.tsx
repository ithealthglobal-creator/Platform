'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Document, Share, FlowStream } from '@carbon/icons-react'

const TILES = [
  {
    href: '/growth/content/blog',
    icon: Document,
    title: 'Blog Posts',
    description: 'Owned content. Published posts attribute incoming sessions to specific articles.',
  },
  {
    href: '/growth/awareness/social',
    icon: Share,
    title: 'Social Posts',
    description: 'Organic social posts on LinkedIn / X / Facebook / Instagram. Tracked as earned reach.',
  },
  {
    href: '/growth/funnel',
    icon: FlowStream,
    title: 'Funnel',
    description: 'See how each awareness source converts through the onboarding wizard into modernization phases.',
  },
]

export default function AwarenessPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Awareness</h1>
        <p className="text-sm text-muted-foreground">
          Manage the top-of-funnel sources that drive traffic into the public website.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {TILES.map((t) => {
          const Icon = t.icon
          return (
            <Link key={t.href} href={t.href}>
              <Card className="h-full transition-colors hover:border-slate-400">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Icon size={20} className="text-slate-700" />
                    <CardTitle className="text-base">{t.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {t.description}
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
