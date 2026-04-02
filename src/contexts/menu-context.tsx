'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useAuth } from '@/contexts/auth-context'
import { MenuItem } from '@/lib/types'

interface MenuContextType {
  menuTree: MenuItem[]
  flatMenu: MenuItem[]
  loading: boolean
  refresh: () => Promise<void>
}

const MenuContext = createContext<MenuContextType | undefined>(undefined)

function buildTree(items: MenuItem[]): MenuItem[] {
  const map = new Map<string, MenuItem>()
  const roots: MenuItem[] = []

  items.forEach(item => {
    map.set(item.id, { ...item, children: [] })
  })

  map.forEach(item => {
    if (item.parent_id && map.has(item.parent_id)) {
      map.get(item.parent_id)!.children!.push(item)
    } else if (!item.parent_id) {
      roots.push(item)
    }
  })

  return roots
}

export function MenuProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const [flatMenu, setFlatMenu] = useState<MenuItem[]>([])
  const [menuTree, setMenuTree] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    const { data, error } = await supabase.rpc('get_menu_tree', {
      user_role: profile.role,
    })
    if (!error && data) {
      setFlatMenu(data as MenuItem[])
      setMenuTree(buildTree(data as MenuItem[]))
    }
    setLoading(false)
  }, [profile])

  useEffect(() => {
    if (profile) {
      refresh()
    }
  }, [profile, refresh])

  return (
    <MenuContext.Provider value={{ menuTree, flatMenu, loading, refresh }}>
      {children}
    </MenuContext.Provider>
  )
}

export function useMenu() {
  const context = useContext(MenuContext)
  if (!context) throw new Error('useMenu must be used within MenuProvider')
  return context
}
