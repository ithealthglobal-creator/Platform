'use client'

import { useMemo } from 'react'
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

interface PositionedNode {
  agent: AgentWithHierarchy
  x: number
  y: number
  level: HierarchyLevel
}

const H_SPACING = 200
const V_SPACING = 120
const NODE_WIDTH = 180
const NODE_HEIGHT = 60
const PADDING = 60
const TRAY_LABEL_HEIGHT = 28

function getHierarchyLevel(levelStr: string): HierarchyLevel {
  switch (levelStr) {
    case 'king': return 'king'
    case 'department': return 'department'
    case 'manager': return 'manager'
    case 'worker': return 'worker'
    default: return 'worker'
  }
}

export function OrgChart({ agents, onNodeClick }: OrgChartProps) {
  const { positions, connections, unassigned, viewBox } = useMemo(() => {
    const assigned = agents.filter((a) => a.hierarchy)
    const unassigned = agents.filter((a) => !a.hierarchy)

    // Sort assigned agents by sort_order
    assigned.sort((a, b) => (a.hierarchy!.sort_order ?? 0) - (b.hierarchy!.sort_order ?? 0))

    // Build a map: id -> agent
    const agentMap = new Map(assigned.map((a) => [a.id, a]))

    // Group by level
    const byLevel: Record<HierarchyLevel, AgentWithHierarchy[]> = {
      king: [],
      department: [],
      manager: [],
      worker: [],
    }
    for (const a of assigned) {
      const lvl = getHierarchyLevel(a.hierarchy!.hierarchy_level)
      byLevel[lvl].push(a)
    }

    // Determine level row indices
    const levelOrder: HierarchyLevel[] = ['king', 'department', 'manager', 'worker']
    const activeLevels = levelOrder.filter((l) => byLevel[l].length > 0)

    // Position nodes row by row, grouping children under parents
    const positions: PositionedNode[] = []
    const posMap = new Map<string, PositionedNode>()

    // Place each level
    activeLevels.forEach((lvl, rowIdx) => {
      const nodes = byLevel[lvl]
      const y = PADDING + rowIdx * (NODE_HEIGHT + V_SPACING) + NODE_HEIGHT / 2

      // For each node in this level, try to center under parent
      // First pass: assign tentative x based on sorted order
      const count = nodes.length
      const totalWidth = (count - 1) * H_SPACING
      const startX = PADDING + NODE_WIDTH / 2 + totalWidth / 2

      // Center the whole row
      nodes.forEach((agent, colIdx) => {
        const x = PADDING + NODE_WIDTH / 2 + colIdx * H_SPACING
        const positioned: PositionedNode = { agent, x, y, level: lvl }
        positions.push(positioned)
        posMap.set(agent.id, positioned)
      })
    })

    // Compute connections
    const connections: Array<{ x1: number; y1: number; x2: number; y2: number }> = []
    for (const agent of assigned) {
      const parentId = agent.hierarchy!.parent_agent_id
      if (!parentId) continue
      const parentPos = posMap.get(parentId)
      const childPos = posMap.get(agent.id)
      if (!parentPos || !childPos) continue
      connections.push({
        x1: parentPos.x,
        y1: parentPos.y + NODE_HEIGHT / 2,
        x2: childPos.x,
        y2: childPos.y - NODE_HEIGHT / 2,
      })
    }

    // Compute viewBox dimensions
    const allX = positions.map((p) => p.x)
    const allY = positions.map((p) => p.y)

    const maxTreeX = allX.length > 0 ? Math.max(...allX) + NODE_WIDTH / 2 + PADDING : PADDING * 2 + NODE_WIDTH
    const maxTreeY = allY.length > 0 ? Math.max(...allY) + NODE_HEIGHT / 2 + PADDING : PADDING * 2 + NODE_HEIGHT

    // Unassigned tray occupies its own row at the bottom
    const trayY = maxTreeY + (unassigned.length > 0 ? TRAY_LABEL_HEIGHT + V_SPACING : 0)
    const trayTotalWidth = unassigned.length > 0
      ? (unassigned.length - 1) * H_SPACING + NODE_WIDTH + PADDING * 2
      : 0
    const svgWidth = Math.max(maxTreeX, trayTotalWidth)
    const svgHeight = unassigned.length > 0 ? trayY + NODE_HEIGHT + PADDING : maxTreeY

    const viewBox = `0 0 ${svgWidth} ${svgHeight}`

    return { positions, connections, unassigned, viewBox, trayY }
  }, [agents])

  // Recalculate trayY for render
  const trayY = useMemo(() => {
    const allY = positions.map((p) => p.y)
    const maxTreeY = allY.length > 0 ? Math.max(...allY) + NODE_HEIGHT / 2 + PADDING : PADDING * 2 + NODE_HEIGHT
    return maxTreeY + (unassigned.length > 0 ? TRAY_LABEL_HEIGHT + V_SPACING : 0)
  }, [positions, unassigned])

  if (agents.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        No agents to display
      </div>
    )
  }

  return (
    <svg
      viewBox={viewBox}
      style={{ width: '100%', height: '100%', minHeight: 400 }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Connection lines */}
      {connections.map((c, i) => (
        <line
          key={i}
          x1={c.x1}
          y1={c.y1}
          x2={c.x2}
          y2={c.y2}
          stroke="#CBD5E1"
          strokeWidth={2}
          strokeLinecap="round"
        />
      ))}

      {/* Positioned nodes */}
      {positions.map((pos) => (
        <OrgNode
          key={pos.agent.id}
          agent={pos.agent}
          level={pos.level}
          x={pos.x}
          y={pos.y}
          onClick={onNodeClick}
        />
      ))}

      {/* Unassigned tray */}
      {unassigned.length > 0 && (
        <>
          <text
            x={PADDING}
            y={trayY - TRAY_LABEL_HEIGHT}
            fontSize={12}
            fontFamily="Poppins, sans-serif"
            fill="#94A3B8"
            fontWeight={500}
          >
            Unassigned
          </text>
          <line
            x1={PADDING}
            y1={trayY - TRAY_LABEL_HEIGHT + 18}
            x2={PADDING + 100}
            y2={trayY - TRAY_LABEL_HEIGHT + 18}
            stroke="#E2E8F0"
            strokeWidth={1}
          />
          {unassigned.map((agent, idx) => (
            <OrgNode
              key={agent.id}
              agent={agent}
              level="worker"
              x={PADDING + NODE_WIDTH / 2 + idx * H_SPACING}
              y={trayY + NODE_HEIGHT / 2}
              onClick={onNodeClick}
            />
          ))}
        </>
      )}
    </svg>
  )
}
