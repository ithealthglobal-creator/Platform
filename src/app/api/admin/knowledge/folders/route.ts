import { NextRequest, NextResponse } from 'next/server'
import { authorizeKnowledgeRequest } from '@/lib/knowledge-auth'

export async function GET(request: NextRequest) {
  const session = await authorizeKnowledgeRequest(request)
  if (session instanceof NextResponse) return session

  const { data, error } = await session.client
    .from('knowledge_folders')
    .select('id, parent_id, name, sort_order, created_at, updated_at')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ folders: data ?? [] })
}

export async function POST(request: NextRequest) {
  const session = await authorizeKnowledgeRequest(request)
  if (session instanceof NextResponse) return session

  const body = await request.json()
  const name = (body.name ?? 'New folder').toString().trim() || 'New folder'
  const parent_id = body.parent_id ?? null
  const sort_order = Number.isFinite(body.sort_order) ? body.sort_order : 0

  const { data, error } = await session.client
    .from('knowledge_folders')
    .insert({
      name,
      parent_id,
      sort_order,
      company_id: session.companyId,
      created_by: session.userId,
    })
    .select('id, parent_id, name, sort_order, created_at, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ folder: data })
}
