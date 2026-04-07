import 'server-only'

const META_API_BASE = 'https://graph.facebook.com/v21.0'

interface MetaApiOptions {
  accessToken: string
}

export async function metaApiGet<T>(path: string, params: Record<string, string>, options: MetaApiOptions): Promise<T> {
  const url = new URL(`${META_API_BASE}${path}`)
  url.searchParams.set('access_token', options.accessToken)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  const res = await fetch(url.toString())
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error?.message || `Meta API error: ${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function metaApiPost<T>(path: string, body: Record<string, unknown>, options: MetaApiOptions): Promise<T> {
  const url = new URL(`${META_API_BASE}${path}`)
  url.searchParams.set('access_token', options.accessToken)
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error?.message || `Meta API error: ${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function metaApiPostFormData<T>(path: string, formData: FormData, options: MetaApiOptions): Promise<T> {
  const url = new URL(`${META_API_BASE}${path}`)
  url.searchParams.set('access_token', options.accessToken)
  const res = await fetch(url.toString(), {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error?.message || `Meta API error: ${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function metaApiDelete(path: string, options: MetaApiOptions): Promise<void> {
  const url = new URL(`${META_API_BASE}${path}`)
  url.searchParams.set('access_token', options.accessToken)
  const res = await fetch(url.toString(), { method: 'DELETE' })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error?.message || `Meta API error: ${res.status}`)
  }
}

export function computeEmqScore(qualityRanking: string, engagementRanking: string, conversionRanking: string): number {
  const rankToScore = (rank: string): number => {
    if (rank.startsWith('ABOVE_AVERAGE')) return 3
    if (rank === 'AVERAGE') return 2
    return 1
  }
  return rankToScore(qualityRanking) + rankToScore(engagementRanking) + rankToScore(conversionRanking)
}
