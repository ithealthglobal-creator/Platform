import { NextRequest, NextResponse } from 'next/server'
import { authorizeKnowledgeRequest } from '@/lib/knowledge-auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await authorizeKnowledgeRequest(request)
  if (session instanceof NextResponse) return session

  const { id } = await params
  const body = await request.json()
  const update: Record<string, unknown> = {}
  if (typeof body.name === 'string') update.name = body.name.trim() || 'Untitled'
  if ('parent_id' in body) update.parent_id = body.parent_id ?? null
  if (typeof body.sort_order === 'number') update.sort_order = body.sort_order

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No updatable fields' }, { status: 400 })
  }

  if (update.parent_id === id) {
    return NextResponse.json({ error: 'A folder cannot be its own parent' }, { status: 400 })
  }

  const { data, error } = await session.client
    .from('knowledge_folders')
    .update(update)
    .eq('id', id)
    .select('id, parent_id, name, sort_order, created_at, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ folder: data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await authorizeKnowledgeRequest(request)
  if (session instanceof NextResponse) return session

  const { id } = await params
  const { error } = await session.client
    .from('knowledge_folders')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
