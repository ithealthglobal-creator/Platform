export type UserRole = 'admin' | 'customer' | 'partner'

export interface Company {
  id: string
  name: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  company_id: string
  role: UserRole
  display_name: string
  email: string
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  company?: Company
}

export interface MenuItem {
  id: string
  parent_id: string | null
  label: string
  icon: string | null
  route: string | null
  sort_order: number
  level: number
  is_active: boolean
  created_at: string
  updated_at: string
  children?: MenuItem[]
}

export interface RoleMenuAccess {
  role: UserRole
  menu_item_id: string
}
