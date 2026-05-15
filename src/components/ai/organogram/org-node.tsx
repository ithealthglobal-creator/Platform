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
  muted?: boolean
}

const LEVEL_STYLES: Record<HierarchyLevel, { fill: string; accent: string; text: string; sub: string }> = {
  king: { fill: '#FEF3C7', accent: '#F59E0B', text: '#78350F', sub: '#92400E' },
  department: { fill: '#DBEAFE', accent: '#3B82F6', text: '#1E3A8A', sub: '#1D4ED8' },
  manager: { fill: '#FCE7F3', accent: '#EC4899', text: '#831843', sub: '#BE185D' },
  worker: { fill: '#E2E8F0', accent: '#475569', text: '#0F172A', sub: '#334155' },
}

const LEVEL_LABEL: Record<HierarchyLevel, string> = {
  king: 'King',
  department: 'Department',
  manager: 'Manager',
  worker: 'Worker',
}

const NODE_WIDTH = 200
const NODE_HEIGHT = 64
const ICON_SIZE = 18
const ACCENT_BAR_WIDTH = 4

export function OrgNode({ agent, level, x, y, onClick, muted = false }: OrgNodeProps) {
  const style = LEVEL_STYLES[level]
  const IconComponent = agent.icon ? iconMap[agent.icon] : null

  const maxNameChars = 22
  const truncatedName =
    agent.name.length > maxNameChars ? agent.name.slice(0, maxNameChars - 1) + '…' : agent.name

  const opacity = muted ? 0.65 : 1

  return (
    <g
      transform={`translate(${x - NODE_WIDTH / 2}, ${y - NODE_HEIGHT / 2})`}
      onClick={(e) => {
        e.stopPropagation()
        onClick(agent)
      }}
      style={{ cursor: 'pointer', opacity }}
      className="org-node"
    >
      {/* Drop shadow via filter (subtle) */}
      <rect
        width={NODE_WIDTH}
        height={NODE_HEIGHT}
        rx={10}
        ry={10}
        fill="#ffffff"
        stroke="#E2E8F0"
        strokeWidth={1}
        style={{ filter: 'drop-shadow(0 1px 2px rgba(15,23,42,0.06)) drop-shadow(0 2px 8px rgba(15,23,42,0.04))' }}
      />

      {/* Left accent bar */}
      <rect
        x={0}
        y={0}
        width={ACCENT_BAR_WIDTH}
        height={NODE_HEIGHT}
        rx={2}
        ry={2}
        fill={style.accent}
      />
      <rect
        x={ACCENT_BAR_WIDTH}
        y={0}
        width={ACCENT_BAR_WIDTH}
        height={NODE_HEIGHT}
        fill={style.accent}
        opacity={0}
      />

      {/* Icon badge */}
      {IconComponent ? (
        <>
          <rect
            x={14}
            y={(NODE_HEIGHT - 30) / 2}
            width={30}
            height={30}
            rx={6}
            ry={6}
            fill={style.fill}
          />
          <foreignObject
            x={14 + (30 - ICON_SIZE) / 2}
            y={(NODE_HEIGHT - ICON_SIZE) / 2}
            width={ICON_SIZE}
            height={ICON_SIZE}
          >
            <div style={{ color: style.sub, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconComponent size={ICON_SIZE} />
            </div>
          </foreignObject>
        </>
      ) : (
        <rect
          x={14}
          y={(NODE_HEIGHT - 30) / 2}
          width={30}
          height={30}
          rx={6}
          ry={6}
          fill={style.fill}
        />
      )}

      {/* Name */}
      <text
        x={56}
        y={NODE_HEIGHT / 2 - 6}
        fill={style.text}
        fontSize={13}
        fontFamily="Poppins, sans-serif"
        fontWeight={600}
        dominantBaseline="middle"
      >
        {truncatedName}
      </text>

      {/* Sub-label (level) */}
      <text
        x={56}
        y={NODE_HEIGHT / 2 + 12}
        fill={style.sub}
        fontSize={10}
        fontFamily="Poppins, sans-serif"
        fontWeight={500}
        dominantBaseline="middle"
        style={{ letterSpacing: '0.04em', textTransform: 'uppercase' as const }}
      >
        {LEVEL_LABEL[level]}
      </text>

      {/* Hover overlay for affordance */}
      <rect
        width={NODE_WIDTH}
        height={NODE_HEIGHT}
        rx={10}
        ry={10}
        fill="transparent"
        className="hover:fill-slate-900/[0.02] transition-colors"
      />
    </g>
  )
}
