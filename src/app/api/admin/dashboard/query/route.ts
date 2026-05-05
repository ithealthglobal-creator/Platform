import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8100'

async function verifySession(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null
  return { user, token }
}

export async function POST(request: NextRequest) {
  const session = await verifySession(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  const response = await fetch(`${AI_SERVICE_URL}/dashboard/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.token}`,
    },
    body: JSON.stringify(body),
  })

  const text = await response.text()
  return new Response(text, {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
