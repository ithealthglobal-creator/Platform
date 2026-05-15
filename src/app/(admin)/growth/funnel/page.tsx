'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useAuth } from '@/contexts/auth-context'
import type {
  FunnelMetrics,
  FunnelCanvas,
  FunnelCanvasLayout,
  AwarenessSourceType,
} from '@/lib/types'
import { Button } from '@/components/ui/button'
import { FunnelCanvas as FunnelCanvasComponent } from './_components/funnel-canvas'
import { FunnelToolbar } from './_components/funnel-toolbar'
import { toast } from 'sonner'

const ALL_SOURCE_TYPES: AwarenessSourceType[] = ['paid', 'social', 'blog']

export default function FunnelPage() {
  const { profile } = useAuth()
  const [metrics, setMetrics] = useState<FunnelMetrics | null>(null)
  const [canvas, setCanvas] = useState<FunnelCanvas | null>(null)
  const [loading, setLoading] = useState(true)
  const [dirty, setDirty] = useState(false)
  const [pendingLayout, setPendingLayout] = useState<FunnelCanvasLayout | null>(null)

  const today = useMemo(() => new Date(), [])
  const defaultFrom = useMemo(() => {
    const d = new Date(today)
    d.setDate(d.getDate() - 30)
    return d
  }, [today])

  const [dateFrom, setDateFrom] = useState<Date>(defaultFrom)
  const [dateTo, setDateTo] = useState<Date>(today)
  const [sourceTypes, setSourceTypes] = useState<AwarenessSourceType[]>(ALL_SOURCE_TYPES)

  const fetchMetrics = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.rpc('get_funnel_metrics', {
      p_date_from: dateFrom.toISOString(),
      p_date_to: dateTo.toISOString(),
    })
    if (error) {
      toast.error('Failed to load funnel metrics')
      setLoading(false)
      return
    }
    setMetrics(data as FunnelMetrics)
    setLoading(false)
  }, [dateFrom, dateTo])

  const fetchCanvas = useCallback(async () => {
    if (!profile?.company_id) return
    const { data } = await supabase
      .from('funnel_canvases')
      .select('*')
      .eq('company_id', profile.company_id)
      .eq('owner_user_id', profile.id)
      .eq('is_default', true)
      .maybeSingle()
    setCanvas((data as FunnelCanvas) ?? null)
  }, [profile?.company_id, profile?.id])

  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  useEffect(() => {
    fetchCanvas()
  }, [fetchCanvas])

  async function handleSaveLayout() {
    if (!profile?.company_id || !pendingLayout) return
    if (canvas) {
      const { error } = await supabase
        .from('funnel_canvases')
        .update({ layout: pendingLayout })
        .eq('id', canvas.id)
      if (error) {
        toast.error('Failed to save layout')
        return
      }
      setCanvas({ ...canvas, layout: pendingLayout })
    } else {
      const { data, error } = await supabase
        .from('funnel_canvases')
        .insert({
          company_id: profile.company_id,
          owner_user_id: profile.id,
          name: 'Default',
          layout: pendingLayout,
          is_default: true,
        })
        .select('*')
        .single()
      if (error || !data) {
        toast.error('Failed to save layout')
        return
      }
      setCanvas(data as FunnelCanvas)
    }
    setDirty(false)
    toast.success('Layout saved')
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      <div className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div>
          <h1 className="text-2xl font-semibold">Funnel</h1>
          <p className="text-sm text-muted-foreground">
            Awareness → Website → Onboarding → Modernization phases
          </p>
        </div>
        <Button onClick={handleSaveLayout} disabled={!dirty || !pendingLayout}>
          Save layout
        </Button>
      </div>

      <FunnelToolbar
        dateFrom={dateFrom}
        dateTo={dateTo}
        sourceTypes={sourceTypes}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onSourceTypesChange={setSourceTypes}
      />

      <div className="flex-1 min-h-0 bg-slate-50">
        {loading || !metrics ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Loading funnel…
          </div>
        ) : (
          <FunnelCanvasComponent
            metrics={metrics}
            sourceTypes={sourceTypes}
            savedLayout={canvas?.layout ?? null}
            onLayoutChange={(layout) => {
              setPendingLayout(layout)
              setDirty(true)
            }}
          />
        )}
      </div>
    </div>
  )
}
