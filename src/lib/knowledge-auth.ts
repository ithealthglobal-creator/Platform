import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase-server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export interface KnowledgeSession {
  userId: string
  token: string
  companyId: string
  role: string
  /** Supabase client that runs queries under the caller's JWT — RLS-scoped. */
  client: SupabaseClient
}

export async function authorizeKnowledgeRequest(
  request: NextRequest,
): Promise<KnowledgeSession | NextResponse> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin' || !profile.company_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Build a JWT-scoped client so RLS applies to all subsequent queries.
  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  return {
    userId: user.id,
    token,
    companyId: profile.company_id,
    role: profile.role,
    client,
  }
}

export function triggerIngest(documentId: string, token: string): void {
  const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8100'
  // Fire-and-forget: don't block the response on embedding work.
  fetch(`${aiServiceUrl}/knowledge/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ document_id: documentId }),
  }).catch(() => {
    // Logged server-side; client doesn't need to know.
  })
}
