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

export type AssessmentType = 'pre' | 'post'

export interface QuestionOption {
  label: string
  value: string
  is_correct: boolean
}

export interface Course {
  id: string
  name: string
  description: string | null
  phase_id: string | null
  service_id: string | null
  thumbnail_url: string | null
  is_published: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  phase?: Phase
  sections?: CourseSection[]
}

export interface CourseSection {
  id: string
  course_id: string
  name: string
  description: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
  modules?: CourseModule[]
  assessments?: Assessment[]
}

export interface CourseModule {
  id: string
  section_id: string
  title: string
  description: string | null
  youtube_url: string
  duration_minutes: number | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Assessment {
  id: string
  section_id: string
  type: AssessmentType
  name: string
  description: string | null
  pass_threshold: number
  is_active: boolean
  created_at: string
  updated_at: string
  questions?: AssessmentQuestion[]
}

export interface AssessmentQuestion {
  id: string
  assessment_id: string
  question_text: string
  options: QuestionOption[]
  sort_order: number
  points: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AssessmentAttempt {
  id: string
  assessment_id: string
  user_id: string
  score: number
  passed: boolean
  answers: { question_id: string; selected_option: string; correct: boolean }[]
  started_at: string
  completed_at: string | null
  created_at: string
}

export interface Certificate {
  id: string
  course_id: string
  user_id: string
  certificate_number: string
  issued_at: string
  revoked_at: string | null
  score: number
  pdf_url: string | null
  created_at: string
  course?: Course
  user?: Profile
}

export interface UserSectionProgress {
  id: string
  user_id: string
  section_id: string
  required: boolean
  modules_completed: string[]
  pre_assessment_passed: boolean
  post_assessment_passed: boolean
  created_at: string
  updated_at: string
}

export type ServiceStatus = 'draft' | 'active' | 'archived'
export type CostingCategory = 'setup' | 'maintenance'
export type PricingType = 'tiered' | 'formula'

export interface CostingTier {
  min: number
  max: number | null
  rate: number
}

export interface Service {
  id: string
  name: string
  description: string | null
  long_description: string | null
  phase_id: string
  status: ServiceStatus
  hero_image_url: string | null
  thumbnail_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  phase?: Phase
}

export interface ServiceProduct {
  service_id: string
  product_id: string
  notes: string | null
  product?: Product
}

export interface ServiceSkill {
  service_id: string
  skill_id: string
  notes: string | null
  skill?: Skill
}

export interface ServiceRunbookStep {
  id: string
  service_id: string
  title: string
  description: string | null
  estimated_minutes: number | null
  product_id: string | null
  skill_id: string | null
  role: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
  product?: Product
  skill?: Skill
}

export interface ServiceCostingItem {
  id: string
  service_id: string
  name: string
  category: CostingCategory
  pricing_type: PricingType
  cost_variable_id: string | null
  formula: string | null
  base_cost: string | null
  tiers: CostingTier[] | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
  cost_variable?: CostVariable
}

export interface ServiceAcademyLink {
  service_id: string
  course_id: string
  is_required: boolean
  course?: Course
}
