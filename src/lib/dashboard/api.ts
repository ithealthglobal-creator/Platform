import { supabase } from '@/lib/supabase-client'
import type {
  DashboardLayout,
  DashboardVisibility,
  QuerySpec,
  SavedDashboard,
} from './types'

export async function listDashboards(): Promise<SavedDashboard[]> {
  const { data, error } = await supabase
    .from('saved_dashboards')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as SavedDashboard[]
}

export async function getDashboard(id: string): Promise<SavedDashboard | null> {
  const { data, error } = await supabase
    .from('saved_dashboards')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data as SavedDashboard | null
}

export async function createDashboard(input: {
  name: string
  layout: DashboardLayout
  visibility: DashboardVisibility
}): Promise<SavedDashboard> {
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData?.session?.user?.id
  if (!userId) throw new Error('Not authenticated')

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', userId)
    .single()
  if (profileErr) throw profileErr

  const { data, error } = await supabase
    .from('saved_dashboards')
    .insert({
      user_id: userId,
      company_id: profile.company_id,
      name: input.name,
      layout: input.layout,
      visibility: input.visibility,
    })
    .select('*')
    .single()
  if (error) throw error
  return data as SavedDashboard
}

export async function updateDashboard(
  id: string,
  patch: Partial<Pick<SavedDashboard, 'name' | 'layout' | 'visibility'>>,
): Promise<SavedDashboard> {
  const { data, error } = await supabase
    .from('saved_dashboards')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as SavedDashboard
}

export async function deleteDashboard(id: string): Promise<void> {
  const { error } = await supabase.from('saved_dashboards').delete().eq('id', id)
  if (error) throw error
}

export async function getDefaultDashboardId(): Promise<string | null> {
  const { data, error } = await supabase
    .from('user_dashboard_prefs')
    .select('default_dashboard_id')
    .maybeSingle()
  if (error) throw error
  return (data?.default_dashboard_id as string | null) ?? null
}

export async function setDefaultDashboard(dashboardId: string | null): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData?.session?.user?.id
  if (!userId) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('user_dashboard_prefs')
    .upsert(
      { user_id: userId, default_dashboard_id: dashboardId },
      { onConflict: 'user_id' },
    )
  if (error) throw error
}

export async function runChartQuery(
  spec: QuerySpec,
): Promise<{ rows: Record<string, unknown>[]; row_count: number }> {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token
  if (!token) throw new Error('Not authenticated')

  const res = await fetch('/api/admin/dashboard/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ spec }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Query failed: ${text}`)
  }
  return (await res.json()) as { rows: Record<string, unknown>[]; row_count: number }
}
