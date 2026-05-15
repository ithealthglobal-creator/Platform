'use client'

import { useMemo, useRef, useState, useCallback, useEffect } from 'react'
import { Add, Subtract, FitToScreen } from '@carbon/icons-react'
import { OrgNode, OrgNodeAgent } from './org-node'

type HierarchyLevel = 'king' | 'department' | 'manager' | 'worker'

interface AgentWithHierarchy extends OrgNodeAgent {
  hierarchy?: {
    parent_agent_id: string | null
    hierarchy_level: string
    sort_order: number
  }
}

interface OrgChartProps {
  agents: AgentWithHierarchy[]
  onNodeClick: (agent: AgentWithHierarchy) => void
}

interface TreeNode {
  agent: AgentWithHierarchy
  level: HierarchyLevel
  children: TreeNode[]
  width: number
  x: number
  y: number
  depth: number
}

const NODE_WIDTH = 200
const NODE_HEIGHT = 64
const H_GAP = 32
const V_GAP = 80
const PADDING = 60
const TRAY_LABEL_HEIGHT = 32

function getHierarchyLevel(levelStr: string | undefined): HierarchyLevel {
  switch (levelStr) {
    case 'king':
    case 'department':
    case 'manager':
    case 'worker':
      return levelStr
    default:
      return 'worker'
  }
}

function levelFromDepth(depth: number): HierarchyLevel {
  // Fallback when hierarchy_level is missing or inconsistent
  if (depth === 0) return 'king'
  if (depth === 1) return 'department'
  if (depth === 2) return 'manager'
  return 'worker'
}

export function OrgChart({ agents, onNodeClick }: OrgChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 })
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null)

  const { trees, unassigned, svgWidth, svgHeight, trayY, trayNodesPerRow } = useMemo(() => {
    // Hoist orphan parents: if an agent's hierarchy.parent_agent_id points to
    // another agent that exists in ai_agents but has no hierarchy row, synthesize
    // a hierarchy entry for the parent so it appears in the tree instead of its
    // children popping up as orphan roots.
    const hoisted: AgentWithHierarchy[] = agents.map((a) => {
      if (a.hierarchy) return a
      const referencedAsParent = agents.some(
        (c) => c.hierarchy?.parent_agent_id === a.id
      )
      if (!referencedAsParent) return a
      return {
        ...a,
        hierarchy: {
          parent_agent_id: null,
          hierarchy_level: 'department',
          sort_order: 999,
        },
      }
    })

    const assigned = hoisted.filter((a) => a.hierarchy)
    const unassigned = hoisted.filter((a) => !a.hierarchy)

    // Build child map
    const childMap = new Map<string | null, AgentWithHierarchy[]>()
    for (const a of assigned) {
      const pid = a.hierarchy!.parent_agent_id
      if (!childMap.has(pid)) childMap.set(pid, [])
      childMap.get(pid)!.push(a)
    }
    // Sort children by sort_order then name
    for (const arr of childMap.values()) {
      arr.sort((a, b) => {
        const so = (a.hierarchy!.sort_order ?? 0) - (b.hierarchy!.sort_order ?? 0)
        if (so !== 0) return so
        return a.name.localeCompare(b.name)
      })
    }

    // Roots = anything whose parent_agent_id is null OR whose parent isn't in the set
    const assignedIds = new Set(assigned.map((a) => a.id))
    const rootAgents = assigned.filter((a) => {
      const pid = a.hierarchy!.parent_agent_id
      return pid === null || !assignedIds.has(pid)
    })
    rootAgents.sort((a, b) => {
      const so = (a.hierarchy!.sort_order ?? 0) - (b.hierarchy!.sort_order ?? 0)
      if (so !== 0) return so
      return a.name.localeCompare(b.name)
    })

    // Build tree recursively with cycle guard
    function buildTree(agent: AgentWithHierarchy, depth: number, seen: Set<string>): TreeNode {
      if (seen.has(agent.id)) {
        return {
          agent,
          level: getHierarchyLevel(agent.hierarchy?.hierarchy_level) || levelFromDepth(depth),
          children: [],
          width: NODE_WIDTH,
          x: 0,
          y: 0,
          depth,
        }
      }
      const nextSeen = new Set(seen)
      nextSeen.add(agent.id)
      const kids = (childMap.get(agent.id) ?? []).map((c) => buildTree(c, depth + 1, nextSeen))
      const childrenWidth = kids.reduce((sum, k) => sum + k.width, 0) + Math.max(0, kids.length - 1) * H_GAP
      const width = Math.max(NODE_WIDTH, childrenWidth)
      const level = agent.hierarchy?.hierarchy_level
        ? getHierarchyLevel(agent.hierarchy.hierarchy_level)
        : levelFromDepth(depth)
      return { agent, level, children: kids, width, x: 0, y: 0, depth }
    }

    const trees: TreeNode[] = rootAgents.map((r) => buildTree(r, 0, new Set()))

    // Assign coordinates (DFS): parent centered above its children span
    function layout(node: TreeNode, leftX: number, depth: number) {
      node.y = PADDING + depth * (NODE_HEIGHT + V_GAP) + NODE_HEIGHT / 2
      if (node.children.length === 0) {
        node.x = leftX + node.width / 2
        return
      }
      let cursor = leftX
      for (const child of node.children) {
        layout(child, cursor, depth + 1)
        cursor += child.width + H_GAP
      }
      const first = node.children[0]
      const last = node.children[node.children.length - 1]
      node.x = (first.x + last.x) / 2
    }

    let forestLeft = PADDING
    let maxDepth = 0
    for (const t of trees) {
      layout(t, forestLeft, 0)
      forestLeft += t.width + H_GAP * 2
      const dive = (n: TreeNode) => {
        if (n.depth > maxDepth) maxDepth = n.depth
        n.children.forEach(dive)
      }
      dive(t)
    }

    const treeTotalWidth = trees.length > 0
      ? trees.reduce((sum, t) => sum + t.width, 0) + Math.max(0, trees.length - 1) * H_GAP * 2 + PADDING * 2
      : PADDING * 2 + NODE_WIDTH

    const treeBottom = trees.length > 0
      ? PADDING + (maxDepth + 1) * (NODE_HEIGHT + V_GAP) - V_GAP + PADDING
      : PADDING * 2 + NODE_HEIGHT

    // Unassigned tray: wrap across rows if needed
    const trayNodesPerRow = Math.max(
      1,
      Math.floor((treeTotalWidth - PADDING * 2 + H_GAP) / (NODE_WIDTH + H_GAP))
    )
    const trayRows = Math.ceil(unassigned.length / trayNodesPerRow)
    const trayHeight = unassigned.length > 0
      ? TRAY_LABEL_HEIGHT + trayRows * NODE_HEIGHT + Math.max(0, trayRows - 1) * (V_GAP / 2) + PADDING
      : 0

    const trayY = treeBottom

    const svgWidth = Math.max(
      treeTotalWidth,
      unassigned.length > 0
        ? PADDING * 2 + Math.min(unassigned.length, trayNodesPerRow) * NODE_WIDTH + Math.max(0, Math.min(unassigned.length, trayNodesPerRow) - 1) * H_GAP
        : 0
    )
    const svgHeight = treeBottom + trayHeight

    return { trees, unassigned, svgWidth, svgHeight, trayY, trayNodesPerRow }
  }, [agents])

  // Flatten trees into render lists
  const { nodes, connections } = useMemo(() => {
    const nodes: TreeNode[] = []
    const connections: Array<{ id: string; d: string }> = []

    const walk = (n: TreeNode) => {
      nodes.push(n)
      for (const c of n.children) {
        // Orthogonal elbow: down from parent, horizontal at midline, down to child
        const startX = n.x
        const startY = n.y + NODE_HEIGHT / 2
        const endX = c.x
        const endY = c.y - NODE_HEIGHT / 2
        const midY = startY + (endY - startY) / 2
        const d = `M ${startX} ${startY} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${endY}`
        connections.push({ id: `${n.agent.id}->${c.agent.id}`, d })
        walk(c)
      }
    }
    for (const t of trees) walk(t)
    return { nodes, connections }
  }, [trees])

  // Pan handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('.org-node')) return // don't pan when clicking a node
    setIsPanning(true)
    panStart.current = { x: e.clientX, y: e.clientY, tx: transform.x, ty: transform.y }
  }, [transform.x, transform.y])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning || !panStart.current) return
    const dx = e.clientX - panStart.current.x
    const dy = e.clientY - panStart.current.y
    setTransform((t) => ({ ...t, x: panStart.current!.tx + dx, y: panStart.current!.ty + dy }))
  }, [isPanning])

  const onMouseUp = useCallback(() => {
    setIsPanning(false)
    panStart.current = null
  }, [])

  const onWheel = useCallback((e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setTransform((t) => {
      const next = Math.min(2, Math.max(0.3, t.scale * delta))
      return { ...t, scale: next }
    })
  }, [])

  const zoomIn = () => setTransform((t) => ({ ...t, scale: Math.min(2, t.scale * 1.2) }))
  const zoomOut = () => setTransform((t) => ({ ...t, scale: Math.max(0.3, t.scale / 1.2) }))

  const fitToScreen = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const scaleX = (rect.width - 80) / svgWidth
    const scaleY = (rect.height - 80) / svgHeight
    const scale = Math.min(1, Math.min(scaleX, scaleY))
    const x = (rect.width - svgWidth * scale) / 2
    const y = 40
    setTransform({ x, y, scale })
  }, [svgWidth, svgHeight])

  // Initial fit once data is laid out
  useEffect(() => {
    if (agents.length === 0) return
    const id = window.requestAnimationFrame(() => fitToScreen())
    return () => window.cancelAnimationFrame(id)
  }, [agents.length, fitToScreen])

  if (agents.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-slate-500">
        No agents to display
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-slate-50"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onWheel={onWheel}
      style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
    >
      {/* Dot grid background */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #CBD5E1 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          opacity: 0.35,
        }}
      />

      <svg
        width={svgWidth}
        height={svgHeight}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: '0 0',
          transition: isPanning ? 'none' : 'transform 0.15s ease-out',
        }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Connections */}
        <g fill="none" stroke="#94A3B8" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          {connections.map((c) => (
            <path key={c.id} d={c.d} />
          ))}
        </g>

        {/* Nodes */}
        {nodes.map((n) => (
          <OrgNode
            key={n.agent.id}
            agent={n.agent}
            level={n.level}
            x={n.x}
            y={n.y}
            onClick={onNodeClick}
          />
        ))}

        {/* Unassigned tray */}
        {unassigned.length > 0 && (
          <g>
            <line
              x1={PADDING}
              y1={trayY + TRAY_LABEL_HEIGHT / 2}
              x2={svgWidth - PADDING}
              y2={trayY + TRAY_LABEL_HEIGHT / 2}
              stroke="#E2E8F0"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <text
              x={PADDING}
              y={trayY + TRAY_LABEL_HEIGHT / 2 - 6}
              fontSize={11}
              fontFamily="Poppins, sans-serif"
              fill="#94A3B8"
              fontWeight={500}
              letterSpacing="0.05em"
              style={{ textTransform: 'uppercase' }}
            >
              Unassigned ({unassigned.length})
            </text>
            {unassigned.map((agent, idx) => {
              const row = Math.floor(idx / trayNodesPerRow)
              const col = idx % trayNodesPerRow
              const x = PADDING + NODE_WIDTH / 2 + col * (NODE_WIDTH + H_GAP)
              const y = trayY + TRAY_LABEL_HEIGHT + NODE_HEIGHT / 2 + row * (NODE_HEIGHT + V_GAP / 2)
              return (
                <OrgNode
                  key={agent.id}
                  agent={agent}
                  level="worker"
                  x={x}
                  y={y}
                  onClick={onNodeClick}
                  muted
                />
              )
            })}
          </g>
        )}
      </svg>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1 bg-white border border-slate-200 rounded-md shadow-sm">
        <button
          type="button"
          onClick={zoomIn}
          className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Zoom in"
        >
          <Add size={16} />
        </button>
        <div className="border-t border-slate-200" />
        <button
          type="button"
          onClick={zoomOut}
          className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Zoom out"
        >
          <Subtract size={16} />
        </button>
        <div className="border-t border-slate-200" />
        <button
          type="button"
          onClick={fitToScreen}
          className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Fit to screen"
        >
          <FitToScreen size={16} />
        </button>
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-4 left-4 text-xs text-slate-500 bg-white border border-slate-200 rounded-md px-2 py-1 shadow-sm">
        {Math.round(transform.scale * 100)}%
      </div>
    </div>
  )
}
