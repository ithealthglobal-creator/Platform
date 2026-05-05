'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { toast } from 'sonner'
import { ChartLine, Close } from '@carbon/icons-react'
import { Button } from '@/components/ui/button'
import { DashboardCanvas } from '@/components/dashboard/dashboard-canvas'
import { DashboardTabs } from '@/components/dashboard/dashboard-tabs'
import { DashboardGeneratorPanel } from '@/components/dashboard/dashboard-generator-panel'
import {
  createDashboard,
  deleteDashboard,
  getDashboard,
  getDefaultDashboardId,
  listDashboards,
  setDefaultDashboard,
  updateDashboard,
} from '@/lib/dashboard/api'
import type {
  ChartSpec,
  DashboardLayout,
  DashboardVisibility,
  SavedDashboard,
} from '@/lib/dashboard/types'

export default function DashboardPage() {
  const [dashboards, setDashboards] = useState<SavedDashboard[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [defaultId, setDefaultId] = useState<string | null>(null)
  const [charts, setCharts] = useState<ChartSpec[]>([])
  const [visibility, setVisibility] = useState<DashboardVisibility>('private')
  const [selectedChartId, setSelectedChartId] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [resetSignal, setResetSignal] = useState(0)
  const [agentOpen, setAgentOpen] = useState(false)
  const initialLoadRef = useRef(false)

  const refreshDashboards = useCallback(async () => {
    try {
      const list = await listDashboards()
      setDashboards(list)
      return list
    } catch (e) {
      toast.error(`Failed to load dashboards: ${(e as Error).message}`)
      return []
    }
  }, [])

  const loadDashboard = useCallback(
    async (id: string | null) => {
      if (id === null) {
        setActiveId(null)
        setCharts([])
        setVisibility('private')
        setSelectedChartId(null)
        setIsDirty(false)
        setResetSignal((s) => s + 1)
        return
      }
      try {
        const d = await getDashboard(id)
        if (!d) {
          toast.error('Dashboard not found')
          return
        }
        setActiveId(d.id)
        setCharts((d.layout?.charts as ChartSpec[]) ?? [])
        setVisibility(d.visibility)
        setSelectedChartId(null)
        setIsDirty(false)
        setResetSignal((s) => s + 1)
      } catch (e) {
        toast.error(`Failed to open dashboard: ${(e as Error).message}`)
      }
    },
    [],
  )

  // Initial load: fetch dashboards + default; open default if any.
  useEffect(() => {
    if (initialLoadRef.current) return
    initialLoadRef.current = true
    ;(async () => {
      const [list, defId] = await Promise.all([
        refreshDashboards(),
        getDefaultDashboardId().catch(() => null),
      ])
      setDefaultId(defId)
      if (defId && list.find((d) => d.id === defId)) {
        await loadDashboard(defId)
      }
    })()
  }, [refreshDashboards, loadDashboard])

  const handleNew = useCallback(() => {
    void loadDashboard(null)
  }, [loadDashboard])

  const handleChartProposed = useCallback((spec: ChartSpec) => {
    setCharts((prev) => {
      const y = prev.length === 0 ? 0 : Math.max(...prev.map((c) => c.layout.y + c.layout.h))
      return [...prev, { ...spec, layout: { ...spec.layout, y } }]
    })
    setIsDirty(true)
  }, [])

  const handleChartUpdated = useCallback(
    (chartId: string, patch: Partial<ChartSpec>) => {
      setCharts((prev) =>
        prev.map((c) =>
          c.id === chartId
            ? {
                ...c,
                ...patch,
                query: patch.query ? { ...c.query, ...patch.query } : c.query,
                config: patch.config ? { ...c.config, ...patch.config } : c.config,
                layout: patch.layout ? { ...c.layout, ...patch.layout } : c.layout,
              }
            : c,
        ),
      )
      setIsDirty(true)
    },
    [],
  )

  const handleChartRemoved = useCallback((chartId: string) => {
    setCharts((prev) => prev.filter((c) => c.id !== chartId))
    setSelectedChartId((s) => (s === chartId ? null : s))
    setIsDirty(true)
  }, [])

  async function handleSaveNew(name: string, vis: DashboardVisibility) {
    try {
      const layout: DashboardLayout = { charts }
      const created = await createDashboard({ name, layout, visibility: vis })
      toast.success(`Saved "${created.name}"`)
      setActiveId(created.id)
      setVisibility(created.visibility)
      setIsDirty(false)
      await refreshDashboards()
    } catch (e) {
      toast.error(`Save failed: ${(e as Error).message}`)
      throw e
    }
  }

  async function handleSaveExisting() {
    if (!activeId) return
    try {
      const layout: DashboardLayout = { charts }
      await updateDashboard(activeId, { layout, visibility })
      toast.success('Dashboard saved')
      setIsDirty(false)
      await refreshDashboards()
    } catch (e) {
      toast.error(`Save failed: ${(e as Error).message}`)
    }
  }

  async function handleSetDefault(id: string | null) {
    try {
      await setDefaultDashboard(id)
      setDefaultId(id)
    } catch (e) {
      toast.error(`Failed to set default: ${(e as Error).message}`)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteDashboard(id)
      toast.success('Dashboard deleted')
      if (defaultId === id) setDefaultId(null)
      if (activeId === id) await loadDashboard(null)
      await refreshDashboards()
    } catch (e) {
      toast.error(`Delete failed: ${(e as Error).message}`)
    }
  }

  function handleChangeVisibility(v: DashboardVisibility) {
    setVisibility(v)
    setIsDirty(true)
  }

  return (
    <div className="-m-6 flex h-[calc(100vh-3rem)] flex-col">
      <DashboardTabs
        dashboards={dashboards}
        activeId={activeId}
        defaultId={defaultId}
        isDirty={isDirty}
        visibility={visibility}
        onSelect={loadDashboard}
        onNew={handleNew}
        onSave={handleSaveNew}
        onSaveExisting={handleSaveExisting}
        onSetDefault={handleSetDefault}
        onDelete={handleDelete}
        onChangeVisibility={handleChangeVisibility}
      />
      <div className="relative min-h-0 flex-1">
        {agentOpen ? (
          <PanelGroup direction="horizontal">
            <Panel defaultSize={70} minSize={40}>
              <div className="h-full bg-gray-50">
                <DashboardCanvas
                  charts={charts}
                  selectedChartId={selectedChartId}
                  onSelectChart={setSelectedChartId}
                  onRemoveChart={handleChartRemoved}
                />
              </div>
            </Panel>
            <PanelResizeHandle className="w-px bg-gray-200 transition-colors data-[resize-handle-state=hover]:bg-primary" />
            <Panel defaultSize={30} minSize={20}>
              <div className="relative h-full">
                <DashboardGeneratorPanel
                  selectedChartId={selectedChartId}
                  onChartProposed={handleChartProposed}
                  onChartUpdated={handleChartUpdated}
                  onChartRemoved={handleChartRemoved}
                  resetSignal={resetSignal}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setAgentOpen(false)}
                  title="Hide Dashboard Generator"
                  className="absolute right-2 top-2 z-10"
                >
                  <Close size={14} />
                </Button>
              </div>
            </Panel>
          </PanelGroup>
        ) : (
          <>
            <div className="h-full bg-gray-50">
              <DashboardCanvas
                charts={charts}
                selectedChartId={selectedChartId}
                onSelectChart={setSelectedChartId}
                onRemoveChart={handleChartRemoved}
              />
            </div>
            <Button
              onClick={() => setAgentOpen(true)}
              title="Open Dashboard Generator"
              className="absolute bottom-6 right-6 z-10 shadow-lg"
            >
              <ChartLine size={16} className="mr-2" />
              Dashboard Generator
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
