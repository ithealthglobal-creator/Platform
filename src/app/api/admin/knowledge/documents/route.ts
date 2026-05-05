import { NextRequest, NextResponse } from 'next/server'
import { authorizeKnowledgeRequest, triggerIngest } from '@/lib/knowledge-auth'

export async function GET(request: NextRequest) {
  const session = await authorizeKnowledgeRequest(request)
  if (session instanceof NextResponse) return session

  const { data, error } = await session.client
    .from('knowledge_documents')
    .select('id, folder_id, title, sort_order, created_at, updated_at, last_ingested_at')
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ documents: data ?? [] })
}

export async function POST(request: NextRequest) {
  const session = await authorizeKnowledgeRequest(request)
  if (session instanceof NextResponse) return session

  const body = await request.json()
  const title = (body.title ?? 'Untitled').toString().trim() || 'Untitled'
  const folder_id = body.folder_id ?? null
  const sort_order = Number.isFinite(body.sort_order) ? body.sort_order : 0
  const content = typeof body.content === 'string' ? body.content : ''

  const { data, error } = await session.client
    .from('knowledge_documents')
    .insert({
      title,
      folder_id,
      sort_order,
      content,
      company_id: session.companyId,
      created_by: session.userId,
    })
    .select('id, folder_id, title, sort_order, created_at, updated_at, last_ingested_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (data && content.trim()) {
    triggerIngest(data.id, session.token)
  }

  return NextResponse.json({ document: data })
}
