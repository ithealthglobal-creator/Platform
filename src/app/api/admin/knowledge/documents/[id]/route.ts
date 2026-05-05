import { NextRequest, NextResponse } from 'next/server'
import { authorizeKnowledgeRequest, triggerIngest } from '@/lib/knowledge-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await authorizeKnowledgeRequest(request)
  if (session instanceof NextResponse) return session

  const { id } = await params
  const { data, error } = await session.client
    .from('knowledge_documents')
    .select('id, folder_id, title, content, sort_order, created_at, updated_at, last_ingested_at')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ document: data })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await authorizeKnowledgeRequest(request)
  if (session instanceof NextResponse) return session

  const { id } = await params
  const body = await request.json()
  const update: Record<string, unknown> = {}
  if (typeof body.title === 'string') update.title = body.title.trim() || 'Untitled'
  if (typeof body.content === 'string') update.content = body.content
  if ('folder_id' in body) update.folder_id = body.folder_id ?? null
  if (typeof body.sort_order === 'number') update.sort_order = body.sort_order

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No updatable fields' }, { status: 400 })
  }

  const { data, error } = await session.client
    .from('knowledge_documents')
    .update(update)
    .eq('id', id)
    .select('id, folder_id, title, sort_order, created_at, updated_at, last_ingested_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Re-ingest only when content actually changed.
  if (typeof body.content === 'string') {
    triggerIngest(id, session.token)
  }

  return NextResponse.json({ document: data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await authorizeKnowledgeRequest(request)
  if (session instanceof NextResponse) return session

  const { id } = await params
  const { error } = await session.client
    .from('knowledge_documents')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
