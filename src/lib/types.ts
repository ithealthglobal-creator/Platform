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

export type LicensingModel = 'per_user' | 'per_device' | 'flat_fee'

export interface Phase {
  id: string
  name: string
  description: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  name: string
  description: string | null
  vendor: string | null
  category: string | null
  licensing_model: LicensingModel | null
  cost: string | null
  logo_url: string | null
  url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CostVariable {
  id: string
  name: string
  description: string | null
  unit_label: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Vertical {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Persona {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Pain {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Gain {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Skill {
  id: string
  name: string
  description: string | null
  category: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}
