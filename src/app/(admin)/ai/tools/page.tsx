import { redirect } from 'next/navigation'
import { AI_TOOLS_CATALOG } from '@/lib/ai-tools-catalog'

export default function AiToolsIndexPage() {
  redirect(`/ai/tools/${AI_TOOLS_CATALOG[0].slug}`)
}
