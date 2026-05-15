'use client'

import { useEffect, useMemo, useCallback } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import type {
  FunnelMetrics,
  FunnelCanvasLayout,
  AwarenessSourceType,
  FunnelStepKey,
} from '@/lib/types'
import { getPhaseColor } from '@/lib/phase-colors'

import { CampaignNode } from './nodes/campaign-node'
import { SocialNode } from './nodes/social-node'
import { BlogNode } from './nodes/blog-node'
import { WebsiteNode } from './nodes/website-node'
import { StepNode } from './nodes/step-node'
import { PhaseNode } from './nodes/phase-node'
import { ConversionEdge } from './edges/conversion-edge'

const nodeTypes: NodeTypes = {
  campaign: CampaignNode,
  social: SocialNode,
  blog: BlogNode,
  website: WebsiteNode,
  step: StepNode,
  phase: PhaseNode,
}

const edgeTypes: EdgeTypes = {
  conversion: ConversionEdge,
}

const COL_X = {
  awareness: 0,
  website: 480,
  steps: 760,
  phases: 1320,
}

const STEP_ORDER: FunnelStepKey[] = ['welcome', 'assessment', 'details', 'confirmation']

function pct(n: number, d: number): string {
  if (!d || d <= 0) return '—'
  return Math.round((n / d) * 100) + '%'
}

interface Props {
  metrics: FunnelMetrics
  sourceTypes: AwarenessSourceType[]
  savedLayout: FunnelCanvasLayout | null
  onLayoutChange: (layout: FunnelCanvasLayout) => void
}

function FunnelCanvasInner({ metrics, sourceTypes, savedLayout, onLayoutChange }: Props) {
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = []
    const edges: Edge[] = []

    const websiteSessions = metrics.website.sessions

    // ---- Awareness column (Paid / Social / Blog), each a stacked sub-group ----
    let y = 0
    const showPaid = sourceTypes.includes('paid')
    const showSocial = sourceTypes.includes('social')
    const showBlog = sourceTypes.includes('blog')

    const ROW_GAP = 110

    if (showPaid && metrics.awareness.paid.length > 0) {
      nodes.push({
        id: 'group-paid',
        type: 'group',
        position: { x: COL_X.awareness, y },
        data: { label: 'Paid' },
        style: {
          width: 280,
          height: 40 + metrics.awareness.paid.length * ROW_GAP,
          backgroundColor: 'rgba(255, 36, 107, 0.04)',
          border: '1px dashed #FF246B55',
          borderRadius: 12,
        },
        draggable: false,
        selectable: false,
      })
      metrics.awareness.paid.forEach((p, i) => {
        nodes.push({
          id: `paid-${p.id}`,
          type: 'campaign',
          parentId: 'group-paid',
          extent: 'parent',
          position: { x: 12, y: 36 + i * ROW_GAP },
          data: p,
        })
        edges.push({
          id: `e-paid-${p.id}-website`,
          source: `paid-${p.id}`,
          target: 'website',
          type: 'conversion',
          data: { label: pct(p.sessions, p.clicks || p.impressions) },
        })
      })
      y += 60 + metrics.awareness.paid.length * ROW_GAP
    }

    if (showSocial && metrics.awareness.social.length > 0) {
      nodes.push({
        id: 'group-social',
        type: 'group',
        position: { x: COL_X.awareness, y },
        data: { label: 'Earned (Social)' },
        style: {
          width: 280,
          height: 40 + metrics.awareness.social.length * ROW_GAP,
          backgroundColor: 'rgba(17, 117, 228, 0.04)',
          border: '1px dashed #1175E455',
          borderRadius: 12,
        },
        draggable: false,
        selectable: false,
      })
      metrics.awareness.social.forEach((p, i) => {
        nodes.push({
          id: `social-${p.id}`,
          type: 'social',
          parentId: 'group-social',
          extent: 'parent',
          position: { x: 12, y: 36 + i * ROW_GAP },
          data: p,
        })
        edges.push({
          id: `e-social-${p.id}-website`,
          source: `social-${p.id}`,
          target: 'website',
          type: 'conversion',
          data: { label: pct(p.sessions, p.clicks || p.impressions) },
        })
      })
      y += 60 + metrics.awareness.social.length * ROW_GAP
    }

    if (showBlog && metrics.awareness.blog.length > 0) {
      nodes.push({
        id: 'group-blog',
        type: 'group',
        position: { x: COL_X.awareness, y },
        data: { label: 'Owned (Blog)' },
        style: {
          width: 280,
          height: 40 + metrics.awareness.blog.length * ROW_GAP,
          backgroundColor: 'rgba(237, 182, 0, 0.06)',
          border: '1px dashed #EDB60055',
          borderRadius: 12,
        },
        draggable: false,
        selectable: false,
      })
      metrics.awareness.blog.forEach((p, i) => {
        nodes.push({
          id: `blog-${p.id}`,
          type: 'blog',
          parentId: 'group-blog',
          extent: 'parent',
          position: { x: 12, y: 36 + i * ROW_GAP },
          data: p,
        })
        edges.push({
          id: `e-blog-${p.id}-website`,
          source: `blog-${p.id}`,
          target: 'website',
          type: 'conversion',
          data: { label: pct(p.sessions, p.views) },
        })
      })
    }

    // ---- Website ----
    nodes.push({
      id: 'website',
      type: 'website',
      position: { x: COL_X.website, y: Math.max(80, y / 2 - 40) },
      data: { sessions: websiteSessions },
    })

    // ---- Onboarding steps ----
    const stepsBy = new Map(metrics.steps.map((s) => [s.key, s]))
    let prevStepId = 'website'
    let prevCount = websiteSessions
    STEP_ORDER.forEach((key, idx) => {
      const s = stepsBy.get(key) ?? { key, entered: 0, completed: 0 }
      const id = `step-${key}`
      nodes.push({
        id,
        type: 'step',
        position: { x: COL_X.steps, y: 40 + idx * 130 },
        data: s,
      })
      edges.push({
        id: `e-${prevStepId}-${id}`,
        source: prevStepId,
        target: id,
        type: 'conversion',
        data: { label: pct(s.entered, prevCount) },
      })
      prevStepId = id
      prevCount = s.completed || s.entered
    })

    // ---- Phases ----
    const totalLeads = metrics.phases.reduce((sum, p) => sum + p.leads, 0)
    metrics.phases.forEach((p, idx) => {
      const id = `phase-${p.id}`
      nodes.push({
        id,
        type: 'phase',
        position: { x: COL_X.phases, y: 40 + idx * 130 },
        data: { ...p, color: getPhaseColor(p.name) },
      })
      edges.push({
        id: `e-${prevStepId}-${id}`,
        source: prevStepId,
        target: id,
        type: 'conversion',
        data: { label: pct(p.leads, totalLeads || prevCount) },
      })
    })

    // ---- Apply saved positions on top ----
    if (savedLayout?.nodes?.length) {
      const positions = new Map(savedLayout.nodes.map((n) => [n.id, { x: n.x, y: n.y }]))
      nodes.forEach((n) => {
        const saved = positions.get(n.id)
        if (saved) n.position = saved
      })
    }

    return { initialNodes: nodes, initialEdges: edges }
  }, [metrics, sourceTypes, savedLayout])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  useEffect(() => {
    setNodes(initialNodes)
    setEdges(initialEdges)
  }, [initialNodes, initialEdges, setNodes, setEdges])

  const handleNodeDragStop = useCallback(() => {
    const layout: FunnelCanvasLayout = {
      nodes: nodes.map((n) => ({ id: n.id, x: n.position.x, y: n.position.y })),
      edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
    }
    onLayoutChange(layout)
  }, [nodes, edges, onLayoutChange])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeDragStop={handleNodeDragStop}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={16} color="#e2e8f0" />
      <Controls />
      <MiniMap pannable zoomable />
    </ReactFlow>
  )
}

export function FunnelCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <FunnelCanvasInner {...props} />
    </ReactFlowProvider>
  )
}
