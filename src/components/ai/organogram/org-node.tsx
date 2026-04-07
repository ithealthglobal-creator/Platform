'use client'

import { iconMap } from '@/lib/icon-map'

export interface OrgNodeAgent {
  id: string
  name: string
  agent_type: string
  icon: string | null
  description: string | null
}

type HierarchyLevel = 'king' | 'department' | 'manager' | 'worker'

interface OrgNodeProps {
  agent: OrgNodeAgent
  level: HierarchyLevel
  x: number
  y: number
  onClick: (agent: OrgNodeAgent) => void
}

const LEVEL_COLORS: Record<HierarchyLevel, { fill: string; text: string }> = {
  king: { fill: '#FFB800', text: '#ffffff' },
  department: { fill: '#4A90D9', text: '#ffffff' },
  manager: { fill: '#E8578A', text: '#ffffff' },
  worker: { fill: '#2D3A5C', text: '#ffffff' },
}

const NODE_WIDTH = 180
const NODE_HEIGHT = 60
const ICON_SIZE = 20

export function OrgNode({ agent, level, x, y, onClick }: OrgNodeProps) {
  const colors = LEVEL_COLORS[level]
  const IconComponent = agent.icon ? iconMap[agent.icon] : null

  const truncatedName =
    agent.name.length > 18 ? agent.name.slice(0, 17) + '…' : agent.name

  return (
    <g
      transform={`translate(${x - NODE_WIDTH / 2}, ${y - NODE_HEIGHT / 2})`}
      onClick={() => onClick(agent)}
      style={{ cursor: 'pointer' }}
      className="org-node"
    >
      <rect
        width={NODE_WIDTH}
        height={NODE_HEIGHT}
        rx={8}
        ry={8}
        fill={colors.fill}
        className="transition-opacity hover:opacity-80"
        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}
      />

      {IconComponent ? (
        <>
          <foreignObject
            x={12}
            y={(NODE_HEIGHT - ICON_SIZE) / 2}
            width={ICON_SIZE}
            height={ICON_SIZE}
          >
            <div style={{ color: colors.text, display: 'flex', alignItems: 'center' }}>
              <IconComponent size={ICON_SIZE} />
            </div>
          </foreignObject>
          <text
            x={40}
            y={NODE_HEIGHT / 2 + 1}
            fill={colors.text}
            fontSize={13}
            fontFamily="Poppins, sans-serif"
            fontWeight={600}
            dominantBaseline="middle"
          >
            {truncatedName}
          </text>
        </>
      ) : (
        <text
          x={NODE_WIDTH / 2}
          y={NODE_HEIGHT / 2 + 1}
          fill={colors.text}
          fontSize={13}
          fontFamily="Poppins, sans-serif"
          fontWeight={600}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {truncatedName}
        </text>
      )}
    </g>
  )
}
