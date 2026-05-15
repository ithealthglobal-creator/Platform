'use client'

import { Label } from '@/components/ui/label'

const SUPABASE_TABLES = [
  'services',
  'phases',
  'products',
  'skills',
  'service_products',
  'service_skills',
  'blog_posts',
  'courses',
  'course_sections',
  'course_modules',
  'orders',
  'service_requests',
  'customer_contracts',
  'companies',
  'partners',
]

const CRUD_OPS = ['read', 'create', 'update', 'delete'] as const
const CRUD_LABELS = { read: 'R', create: 'C', update: 'U', delete: 'D' }

export interface AgentTool {
  tool_type: string
  tool_name: string
  operations: string[] | null
  is_active: boolean
}

interface ToolPermissionsProps {
  tools: AgentTool[]
  onChange: (tools: AgentTool[]) => void
}

export function ToolPermissions({ tools, onChange }: ToolPermissionsProps) {
  function getTableTool(tableName: string): AgentTool | undefined {
    return tools.find((t) => t.tool_type === 'supabase_crud' && t.tool_name === tableName)
  }

  function isOpChecked(tableName: string, op: string): boolean {
    const tool = getTableTool(tableName)
    if (!tool) return false
    return tool.operations?.includes(op) ?? false
  }

  function isTableEnabled(tableName: string): boolean {
    return !!getTableTool(tableName)
  }

  function toggleOp(tableName: string, op: string, checked: boolean) {
    const existing = getTableTool(tableName)
    const updated = [...tools]

    if (!existing) {
      if (!checked) return
      updated.push({
        tool_type: 'supabase_crud',
        tool_name: tableName,
        operations: [op],
        is_active: true,
      })
      onChange(updated)
      return
    }

    const ops = existing.operations ? [...existing.operations] : []
    const newOps = checked ? [...new Set([...ops, op])] : ops.filter((o) => o !== op)

    const idx = updated.findIndex((t) => t.tool_type === 'supabase_crud' && t.tool_name === tableName)
    if (newOps.length === 0) {
      // Remove the tool entirely if no ops
      updated.splice(idx, 1)
    } else {
      updated[idx] = { ...existing, operations: newOps }
    }
    onChange(updated)
  }

  function isWebSearchEnabled(): boolean {
    return tools.some((t) => t.tool_type === 'web_search' && t.tool_name === 'web_search')
  }

  function toggleWebSearch(checked: boolean) {
    const updated = [...tools]
    if (checked) {
      if (!isWebSearchEnabled()) {
        updated.push({ tool_type: 'web_search', tool_name: 'web_search', operations: null, is_active: true })
      }
    } else {
      const idx = updated.findIndex((t) => t.tool_type === 'web_search' && t.tool_name === 'web_search')
      if (idx !== -1) updated.splice(idx, 1)
    }
    onChange(updated)
  }

  return (
    <div className="grid gap-6">
      {/* Supabase Tables */}
      <div className="grid gap-3">
        <Label className="text-sm font-semibold">Supabase Tables</Label>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Table</th>
                {CRUD_OPS.map((op) => (
                  <th key={op} className="w-10 px-2 py-2 text-center font-medium text-muted-foreground">
                    {CRUD_LABELS[op]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SUPABASE_TABLES.map((table, i) => (
                <tr
                  key={table}
                  className={[
                    i % 2 === 0 ? '' : 'bg-muted/20',
                    isTableEnabled(table) ? 'bg-blue-50/40' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <td className="px-3 py-1.5 font-mono text-xs">{table}</td>
                  {CRUD_OPS.map((op) => (
                    <td key={op} className="px-2 py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={isOpChecked(table, op)}
                        onChange={(e) => toggleOp(table, op, e.target.checked)}
                        className="h-4 w-4 rounded border-border cursor-pointer"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* LangChain Tools */}
      <div className="grid gap-3">
        <Label className="text-sm font-semibold">LangChain Tools</Label>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="tool-web-search"
            checked={isWebSearchEnabled()}
            onChange={(e) => toggleWebSearch(e.target.checked)}
            className="h-4 w-4 rounded border-border cursor-pointer"
          />
          <Label htmlFor="tool-web-search" className="cursor-pointer">
            web_search — Search the web for current information
          </Label>
        </div>
      </div>
    </div>
  )
}
