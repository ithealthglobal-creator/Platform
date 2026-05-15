import { redirect } from 'next/navigation'

export default async function LegacyEditAgentRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/ai/agents?id=${id}`)
}
