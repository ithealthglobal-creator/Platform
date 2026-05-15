import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { getToolBySlug } from '@/lib/ai-tools-catalog'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function AiToolDetailPage({ params }: PageProps) {
  const { slug } = await params
  const tool = getToolBySlug(slug)
  if (!tool) notFound()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{tool.name}</h2>
            <p className="mt-1 text-sm text-slate-500">{tool.summary}</p>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            {tool.toolType}
          </Badge>
        </div>

        <hr className="my-5 border-slate-200" />

        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Description
          </p>
          <p className="text-sm leading-relaxed text-slate-700">{tool.description}</p>
        </div>

        <hr className="my-5 border-slate-200" />

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Capabilities
          </p>
          <ul className="space-y-1.5 text-sm text-slate-700">
            {tool.capabilities.map((cap) => (
              <li key={cap} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                <span>{cap}</span>
              </li>
            ))}
          </ul>
        </div>

        <hr className="my-5 border-slate-200" />

        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Configured via
          </p>
          <p className="text-sm text-slate-700">{tool.configuredVia}</p>
        </div>
      </div>
    </div>
  )
}
