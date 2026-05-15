'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useMenu } from '@/contexts/menu-context'
import { MenuItem, UserRole } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Add, Edit, TrashCan, ChevronRight } from '@carbon/icons-react'

interface MenuItemWithChildren extends MenuItem {
  children: MenuItemWithChildren[]
}

type RoleAccessMap = Record<string, UserRole[]>

const ALL_ROLES: UserRole[] = ['admin', 'customer', 'partner']

export default function MenuEditorPage() {
  const { refresh } = useMenu()
  const [items, setItems] = useState<MenuItem[]>([])
  const [tree, setTree] = useState<MenuItemWithChildren[]>([])
  const [roleAccess, setRoleAccess] = useState<RoleAccessMap>({})
  const [loading, setLoading] = useState(true)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formLabel, setFormLabel] = useState('')
  const [formIcon, setFormIcon] = useState('')
  const [formRoute, setFormRoute] = useState('')
  const [formParentId, setFormParentId] = useState<string | null>(null)
  const [formSortOrder, setFormSortOrder] = useState(0)
  const [formActive, setFormActive] = useState(true)
  const [formRoles, setFormRoles] = useState<UserRole[]>([])

  // Collapsed state for tree nodes
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const buildTree = useCallback((flatItems: MenuItem[]): MenuItemWithChildren[] => {
    const map = new Map<string, MenuItemWithChildren>()
    const roots: MenuItemWithChildren[] = []

    flatItems.forEach(item => {
      map.set(item.id, { ...item, children: [] })
    })

    map.forEach(item => {
      if (item.parent_id && map.has(item.parent_id)) {
        map.get(item.parent_id)!.children.push(item)
      } else if (!item.parent_id) {
        roots.push(item)
      }
    })

    return roots
  }, [])

  const fetchAll = useCallback(async () => {
    setLoading(true)

    const [itemsRes, accessRes] = await Promise.all([
      supabase
        .from('menu_items')
        .select('*')
        .order('level')
        .order('sort_order'),
      supabase.from('role_menu_access').select('*'),
    ])

    if (itemsRes.error) {
      toast.error('Failed to load menu items')
      setLoading(false)
      return
    }

    const fetchedItems = (itemsRes.data ?? []) as MenuItem[]
    setItems(fetchedItems)
    setTree(buildTree(fetchedItems))

    // Build role access map
    const accessMap: RoleAccessMap = {}
    if (accessRes.data) {
      for (const row of accessRes.data) {
        if (!accessMap[row.menu_item_id]) {
          accessMap[row.menu_item_id] = []
        }
        accessMap[row.menu_item_id].push(row.role as UserRole)
      }
    }
    setRoleAccess(accessMap)
    setLoading(false)
  }, [buildTree])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  function computeLevel(parentId: string | null): number {
    if (!parentId) return 1
    const parent = items.find(i => i.id === parentId)
    return parent ? parent.level + 1 : 1
  }

  function openCreate(parentId: string | null = null) {
    setEditingItem(null)
    setFormLabel('')
    setFormIcon('')
    setFormRoute('')
    setFormParentId(parentId)
    setFormSortOrder(0)
    setFormActive(true)
    setFormRoles(['admin'])
    setDialogOpen(true)
  }

  function openEdit(item: MenuItem) {
    setEditingItem(item)
    setFormLabel(item.label)
    setFormIcon(item.icon ?? '')
    setFormRoute(item.route ?? '')
    setFormParentId(item.parent_id)
    setFormSortOrder(item.sort_order)
    setFormActive(item.is_active)
    setFormRoles(roleAccess[item.id] ?? [])
    setDialogOpen(true)
  }

  async function handleSave() {
    const trimmedLabel = formLabel.trim()
    if (!trimmedLabel) {
      toast.error('Label is required')
      return
    }

    setSaving(true)
    const level = computeLevel(formParentId)

    const payload = {
      label: trimmedLabel,
      icon: formIcon.trim() || null,
      route: formRoute.trim() || null,
      parent_id: formParentId,
      sort_order: formSortOrder,
      level,
      is_active: formActive,
    }

    let itemId: string

    if (editingItem) {
      const { error } = await supabase
        .from('menu_items')
        .update(payload)
        .eq('id', editingItem.id)

      if (error) {
        toast.error('Failed to update menu item')
        setSaving(false)
        return
      }
      itemId = editingItem.id
    } else {
      const { data, error } = await supabase
        .from('menu_items')
        .insert(payload)
        .select('id')
        .single()

      if (error || !data) {
        toast.error('Failed to create menu item')
        setSaving(false)
        return
      }
      itemId = data.id
    }

    // Update role access
    await supabase.from('role_menu_access').delete().eq('menu_item_id', itemId)
    if (formRoles.length > 0) {
      const { error: roleError } = await supabase
        .from('role_menu_access')
        .insert(formRoles.map(r => ({ role: r, menu_item_id: itemId })))

      if (roleError) {
        toast.error('Saved item but failed to update role access')
      }
    }

    toast.success(editingItem ? 'Menu item updated' : 'Menu item created')
    setSaving(false)
    setDialogOpen(false)
    await fetchAll()
    await refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this menu item? Children will also be deleted.')) return

    const { error } = await supabase.from('menu_items').delete().eq('id', id)
    if (error) {
      toast.error('Failed to delete menu item')
      return
    }

    toast.success('Menu item deleted')
    await fetchAll()
    await refresh()
  }

  function toggleRole(role: UserRole) {
    setFormRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    )
  }

  function toggleCollapse(id: string) {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // Items eligible to be parents (level < 4)
  const parentOptions = items.filter(i => i.level < 4)

  function renderTree(nodes: MenuItemWithChildren[], depth = 0) {
    return nodes.map(item => {
      const hasChildren = item.children.length > 0
      const isCollapsed = collapsed[item.id]

      return (
        <div key={item.id}>
          <div
            style={{ paddingLeft: `${depth * 24 + 12}px` }}
            className="flex items-center gap-2 py-2 px-3 hover:bg-muted/50 rounded"
          >
            {hasChildren ? (
              <button
                onClick={() => toggleCollapse(item.id)}
                className="flex items-center justify-center w-4 h-4 shrink-0"
              >
                <ChevronRight
                  size={16}
                  className={`transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                />
              </button>
            ) : (
              <span className="w-4 shrink-0" />
            )}
            <span className="flex-1 text-sm font-medium">{item.label}</span>
            {item.route && (
              <span className="text-xs text-muted-foreground">{item.route}</span>
            )}
            <Badge variant={item.is_active ? 'default' : 'secondary'}>
              L{item.level}
            </Badge>
            {roleAccess[item.id]?.map(role => (
              <Badge key={role} variant="outline" className="text-[10px] px-1">
                {role}
              </Badge>
            ))}
            {depth < 3 && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => openCreate(item.id)}
                title="Add child"
              >
                <Add size={12} />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => openEdit(item)}
              title="Edit"
            >
              <Edit size={12} />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => handleDelete(item.id)}
              title="Delete"
            >
              <TrashCan size={12} />
            </Button>
          </div>
          {hasChildren && !isCollapsed && renderTree(item.children, depth + 1)}
        </div>
      )
    })
  }

  return (
    <div>
      <div className="flex justify-end mb-6">
        <Button onClick={() => openCreate(null)}>
          <Add size={16} />
          Add Root Item
        </Button>
      </div>

      <div className="rounded-lg border bg-white">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : tree.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No menu items found. Create one to get started.
          </div>
        ) : (
          <div className="py-1">{renderTree(tree)}</div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="menu-label">Label</Label>
              <Input
                id="menu-label"
                value={formLabel}
                onChange={e => setFormLabel(e.target.value)}
                placeholder="Menu item label"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="menu-icon">Icon</Label>
              <Input
                id="menu-icon"
                value={formIcon}
                onChange={e => setFormIcon(e.target.value)}
                placeholder='e.g. dashboard (L1 only)'
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="menu-route">Route</Label>
              <Input
                id="menu-route"
                value={formRoute}
                onChange={e => setFormRoute(e.target.value)}
                placeholder="/path"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="menu-parent">Parent</Label>
              <select
                id="menu-parent"
                value={formParentId ?? ''}
                onChange={e => setFormParentId(e.target.value || null)}
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <option value="">None (Root)</option>
                {parentOptions.map(opt => (
                  <option key={opt.id} value={opt.id}>
                    {'  '.repeat(opt.level - 1)}{opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="menu-sort">Sort Order</Label>
              <Input
                id="menu-sort"
                type="number"
                value={formSortOrder}
                onChange={e => setFormSortOrder(parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="grid gap-2">
              <Label>Role Access</Label>
              <div className="flex gap-2">
                {ALL_ROLES.map(role => (
                  <Button
                    key={role}
                    type="button"
                    size="sm"
                    variant={formRoles.includes(role) ? 'default' : 'outline'}
                    onClick={() => toggleRole(role)}
                  >
                    {role}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="menu-active"
                checked={formActive}
                onChange={e => setFormActive(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="menu-active">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
