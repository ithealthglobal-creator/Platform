export type UserRole = 'admin' | 'customer' | 'partner'

export type CompanyType = 'admin' | 'customer' | 'partner'
export type CompanyStatus = 'prospect' | 'active' | 'churned' | 'pending' | 'approved' | 'inactive'

export interface Company {
  id: string
  name: string
  type: CompanyType
  status: CompanyStatus
  parent_company_id: string | null
  domain: string | null
  tagline: string | null
  support_email: string | null
  contact_email: string | null
  slug: string | null
  created_at: string
  updated_at: string
}

export interface CompanyBranding {
  id: string
  company_id: string
  logo_url: string | null
  logo_light_url: string | null
  icon_url: string | null
  primary_colour: string
  secondary_colour: string
  accent_colour: string | null
  font_heading: string
  font_body: string
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
  is_company_admin: boolean
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
export type AssessmentScope = 'journey' | 'phase' | 'service' | 'course_section'

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
  section_id: string | null
  scope: AssessmentScope
  phase_id: string | null
  service_id: string | null
  type: AssessmentType
  name: string
  description: string | null
  pass_threshold: number
  journey_threshold: number
  is_active: boolean
  is_onboarding: boolean
  welcome_heading: string | null
  welcome_description: string | null
  completion_heading: string | null
  completion_description: string | null
  created_at: string
  updated_at: string
  questions?: AssessmentQuestion[]
  phase?: Phase
  service?: { id: string; name: string }
  section?: { id: string; name: string; course?: { id: string; name: string } }
}

export interface AssessmentQuestion {
  id: string
  assessment_id: string
  question_text: string
  options: QuestionOption[]
  sort_order: number
  points: number
  weight: number
  service_id: string
  is_active: boolean
  created_at: string
  updated_at: string
  service?: Service & { phase?: Phase }
}

export interface AssessmentAttempt {
  id: string
  assessment_id: string
  user_id: string
  score: number
  passed: boolean
  answers: { question_id: string; selected_option: string; correct: boolean }[]
  phase_scores: Record<string, number> | null
  service_scores: Record<string, { earned: number; max: number; pct: number }> | null
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

export interface UserCourseEnrollment {
  id: string
  user_id: string
  course_id: string
  enrolled_at: string
  completed_at: string | null
  last_active_at: string
  last_module_id: string | null
  created_at: string
  updated_at: string
  course?: Course
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

// === Customer Services Types ===

export type BillingPeriod = 'once' | 'monthly' | 'quarterly' | 'annually'
export type ContractStatus = 'pending' | 'active' | 'paused' | 'completed' | 'cancelled'
export type OrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled'
export type PaymentStatus = 'paid' | 'pending' | 'overdue' | 'na'

export interface SlaTemplate {
  id: string
  name: string
  description: string | null
  response_critical: string | null
  response_high: string | null
  response_medium: string | null
  response_low: string | null
  resolution_critical: string | null
  resolution_high: string | null
  resolution_medium: string | null
  resolution_low: string | null
  uptime_guarantee: string | null
  support_hours: string | null
  support_channels: string[] | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ServiceSla {
  id: string
  service_id: string
  sla_template_id: string
  override_response_critical: string | null
  override_response_high: string | null
  override_response_medium: string | null
  override_response_low: string | null
  override_resolution_critical: string | null
  override_resolution_high: string | null
  override_resolution_medium: string | null
  override_resolution_low: string | null
  override_uptime_guarantee: string | null
  override_support_hours: string | null
  override_support_channels: string[] | null
  created_at: string
  updated_at: string
  sla_template?: SlaTemplate
}

export interface CustomerContract {
  id: string
  company_id: string
  service_id: string
  order_item_id: string | null
  status: ContractStatus
  contracted_price: number
  billing_period: BillingPeriod
  started_at: string | null
  renewal_date: string | null
  expires_at: string | null
  payment_status: PaymentStatus
  notes: string | null
  created_at: string
  updated_at: string
  service?: Service
}

export interface ServiceRequest {
  id: string
  company_id: string
  profile_id: string
  service_id: string
  status: 'new' | 'in_review' | 'approved' | 'declined'
  message: string | null
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  company_id: string
  profile_id: string
  order_number: string
  status: OrderStatus
  subtotal: number
  vat_amount: number
  total: number
  billing_email: string | null
  po_number: string | null
  notes: string | null
  payfast_payment_id: string | null
  payfast_status: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
  order_items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  service_id: string
  price: number
  billing_period: BillingPeriod
  created_at: string
  service?: Service
}

export interface CartItem {
  service_id: string
  name: string
  phase_name: string
  phase_color: string
  price: number
  billing_period: BillingPeriod
}

export type BlogPostStatus = 'draft' | 'published'

export interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string | null
  cover_image_url: string | null
  category: string | null
  author_id: string | null
  status: BlogPostStatus
  published_at: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Testimonial {
  id: string
  name: string
  company: string | null
  role: string | null
  quote: string
  avatar_url: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ContactSubmission {
  id: string
  name: string
  email: string
  phone: string | null
  company: string | null
  message: string
  created_at: string
}

export interface PartnerApplication {
  id: string
  company_name: string
  contact_name: string
  email: string
  phone: string | null
  website: string | null
  message: string | null
  created_at: string
}

export interface Partner {
  id: string
  name: string
  logo_url: string | null
  website: string | null
  description: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SalesStage {
  id: string
  name: string
  sort_order: number
  color: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SalesLead {
  id: string
  company_id: string
  stage_id: string
  assessment_attempt_id: string | null
  contact_name: string
  contact_email: string
  notes: string | null
  created_at: string
  updated_at: string
  company?: Company
  assessment_attempt?: AssessmentAttempt
}

// Meta Ads types

export type SyncFrequency = '15min' | '30min' | '1hour' | '6hour' | '24hour'
export type SyncStatus = 'idle' | 'syncing' | 'error'

export interface MetaIntegration {
  id: string
  company_id: string
  meta_app_id: string | null
  ad_account_id: string | null
  ad_account_name: string | null
  sync_frequency: SyncFrequency
  campaign_filter: { include: string[] } | null
  last_synced_at: string | null
  sync_status: SyncStatus
  sync_error: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PayfastIntegration {
  id: string
  company_id: string
  merchant_id: string | null
  merchant_key_encrypted: string | null
  passphrase_encrypted: string | null
  is_sandbox: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface MetaCampaign {
  id: string
  integration_id: string
  meta_campaign_id: string
  name: string
  status: string | null
  objective: string | null
  daily_budget: number | null
  lifetime_budget: number | null
  spend: number
  impressions: number
  clicks: number
  ctr: number | null
  cpm: number | null
  cpa: number | null
  conversions: number
  start_time: string | null
  stop_time: string | null
  synced_at: string
}

export interface MetaAdSet {
  id: string
  campaign_id: string
  meta_ad_set_id: string
  name: string
  status: string | null
  targeting: Record<string, unknown> | null
  daily_budget: number | null
  lifetime_budget: number | null
  spend: number
  impressions: number
  clicks: number
  ctr: number | null
  cpm: number | null
  cpa: number | null
  conversions: number
  synced_at: string
}

export interface MetaAd {
  id: string
  ad_set_id: string
  meta_ad_id: string
  name: string
  status: string | null
  creative_id: string | null
  creative_thumbnail_url: string | null
  creative_body: string | null
  creative_title: string | null
  creative_link_url: string | null
  hook_rate: number | null
  ctr: number | null
  cpm: number | null
  cpa: number | null
  spend: number
  impressions: number
  clicks: number
  conversions: number
  emq_score: number | null
  synced_at: string
}

// ---------------------------------------------------------------------------
// Journey Gantt Chart
// ---------------------------------------------------------------------------
export type TimeUnit = 'hours' | 'days' | 'weeks'

export interface JourneyTimelineStep {
  id: string
  title: string
  description: string | null
  durationMinutes: number
  role: string | null
  startMinute: number
}

export interface JourneyAcademyCourse {
  courseId: string
  courseName: string
  isRequired: boolean
}

export interface JourneyTimelineService {
  id: string
  name: string
  description: string | null
  phaseId: string
  score: number
  durationMinutes: number
  startMinute: number
  academyCourses: JourneyAcademyCourse[]
  steps: JourneyTimelineStep[]
}

export interface JourneyTimelinePhase {
  id: string
  name: string
  sortOrder: number
  durationMinutes: number
  startMinute: number
  services: JourneyTimelineService[]
}

export interface JourneyTimeline {
  phases: JourneyTimelinePhase[]
  totalMinutes: number
  serviceCount: number
  phaseCount: number
}

// ---------------------------------------------------------------------------
// Team Skills Dashboard
// ---------------------------------------------------------------------------
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked'

export interface TeamInvitation {
  id: string
  company_id: string
  invited_by: string
  email: string
  display_name: string | null
  token: string
  status: InvitationStatus
  message: string | null
  expires_at: string
  accepted_at: string | null
  created_at: string
  updated_at: string
}

export interface SkillSnapshot {
  id: string
  user_id: string
  company_id: string
  overall_score: number
  phase_scores: Record<string, number>
  service_scores: Record<string, { earned: number; max: number; pct: number }>
  source: 'onboarding' | 'assessment' | 'course_completion'
  source_id: string | null
  snapshot_at: string
  created_at: string
}

export interface CompositeScore {
  overall: number
  phases: Record<string, number>
  services: Record<string, { earned: number; max: number; pct: number }>
}

export interface TeamDashboardData {
  members: {
    id: string
    display_name: string
    email: string
    is_company_admin: boolean
    scores: CompositeScore | null
    coursesCompleted: number
  }[]
  teamAverages: CompositeScore
  stats: {
    memberCount: number
    avgMaturity: number
    trend30d: number
    coursesCompleted: number
  }
}

export interface TeamTrendPoint {
  week: string
  overall: number
  phases: Record<string, number>
}

export interface MemberProfile {
  myScores: CompositeScore
  teamAverages: CompositeScore
  recommendedCourses: {
    id: string
    name: string
    phase_name: string
    phase_color: string
    service_name: string
    service_score: number
  }[]
}

// ---------------------------------------------------------------------------
// Customer Support
// ---------------------------------------------------------------------------
export type TicketCategory = 'general' | 'billing' | 'service'
export type TicketPriority = 'critical' | 'high' | 'medium' | 'low'
export type TicketStatus = 'open' | 'in_progress' | 'waiting_on_customer' | 'resolved' | 'closed'
export type EmailType = 'new_ticket' | 'reply' | 'status_change' | 'sla_warning' | 'sla_breach'
export type EmailStatus = 'pending' | 'sent' | 'failed'

export interface SupportTicket {
  id: string
  ticket_number: string
  company_id: string
  created_by: string
  assigned_to: string | null
  category: TicketCategory
  service_id: string | null
  priority: TicketPriority
  status: TicketStatus
  subject: string
  description: string
  sla_template_id: string | null
  response_due_at: string | null
  resolution_due_at: string | null
  first_responded_at: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
  company?: Company
  created_by_profile?: Profile
  assigned_to_profile?: Profile
  service?: Service
  sla_template?: SlaTemplate
}

export interface TicketReply {
  id: string
  ticket_id: string
  author_id: string
  body: string
  is_internal: boolean
  email_sent: boolean
  email_sent_at: string | null
  created_at: string
  author?: Profile
}

export interface TicketRoutingRule {
  id: string
  category: TicketCategory
  service_id: string | null
  assigned_to: string
  is_active: boolean
  created_at: string
  assigned_to_profile?: Profile
  service?: Service
}

export interface TicketEmailLog {
  id: string
  ticket_id: string
  reply_id: string | null
  recipient_email: string
  email_type: EmailType
  status: EmailStatus
  sent_at: string | null
  error: string | null
  created_at: string
}

// === Website CMS Types ===

export interface WebsiteSection {
  id: string
  company_id: string
  page: string
  section: string
  content: Record<string, unknown>
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface HeroContent {
  title: string
  subtitle: string
  cta_text?: string
  cta_link?: string
  background_image_url?: string | null
}

export interface HomeMissionContent {
  body: string
}

export interface AboutMissionContent {
  eyebrow?: string
  heading: string
  paragraphs: string[]
  image_url?: string | null
}

export interface TestimonialsContent {
  heading: string
  items: {
    quote: string
    author: string
    role: string
    company: string
    avatar_url?: string | null
  }[]
}

export interface CTAContent {
  heading: string
  subheading: string
  button_text: string
  button_link: string
}

export interface ContactInfoContent {
  email: string
  phone?: string | null
  address?: string | null
}
