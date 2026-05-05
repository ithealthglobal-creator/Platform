import type { Aggregation } from './types'

export interface EntityDef {
  label: string
  description: string
  dimensions: string[]
  measurable: string[]
  default_time_field?: string
  scoped_by_company: boolean
}

export const DASHBOARD_ALLOWLIST: Record<string, EntityDef> = {
  services: {
    label: 'Services',
    description: 'Managed-service catalogue rows',
    dimensions: ['phase_id', 'status', 'created_at'],
    measurable: ['id'],
    default_time_field: 'created_at',
    scoped_by_company: false,
  },
  service_requests: {
    label: 'Service requests',
    description: 'Customer requests for services',
    dimensions: ['service_id', 'status', 'company_id', 'created_at'],
    measurable: ['id'],
    default_time_field: 'created_at',
    scoped_by_company: true,
  },
  orders: {
    label: 'Orders',
    description: 'Sales orders',
    dimensions: ['status', 'company_id', 'created_at'],
    measurable: ['id', 'total_amount'],
    default_time_field: 'created_at',
    scoped_by_company: true,
  },
  order_items: {
    label: 'Order items',
    description: 'Line items per order',
    dimensions: ['order_id', 'service_id', 'created_at'],
    measurable: ['id', 'unit_price', 'quantity'],
    default_time_field: 'created_at',
    scoped_by_company: false,
  },
  customer_contracts: {
    label: 'Customer contracts',
    description: 'Active customer contracts',
    dimensions: ['status', 'company_id', 'service_id', 'created_at'],
    measurable: ['id', 'monthly_amount'],
    default_time_field: 'created_at',
    scoped_by_company: true,
  },
  companies: {
    label: 'Companies',
    description: 'Organisations in the platform',
    dimensions: ['type', 'status', 'parent_company_id', 'created_at'],
    measurable: ['id'],
    default_time_field: 'created_at',
    scoped_by_company: false,
  },
  profiles: {
    label: 'Profiles',
    description: 'User profiles',
    dimensions: ['role', 'company_id', 'is_active', 'created_at'],
    measurable: ['id'],
    default_time_field: 'created_at',
    scoped_by_company: true,
  },
  support_tickets: {
    label: 'Support tickets',
    description: 'Helpdesk tickets',
    dimensions: ['status', 'priority', 'company_id', 'assigned_to', 'created_at'],
    measurable: ['id'],
    default_time_field: 'created_at',
    scoped_by_company: true,
  },
  ticket_replies: {
    label: 'Ticket replies',
    description: 'Replies on support tickets',
    dimensions: ['ticket_id', 'role', 'created_at'],
    measurable: ['id'],
    default_time_field: 'created_at',
    scoped_by_company: false,
  },
  assessment_attempts: {
    label: 'Assessment attempts',
    description: 'Assessments completed by users',
    dimensions: ['user_id', 'assessment_id', 'status', 'created_at'],
    measurable: ['id', 'score'],
    default_time_field: 'created_at',
    scoped_by_company: false,
  },
  user_course_enrollments: {
    label: 'Course enrollments',
    description: 'Users enrolled in academy courses',
    dimensions: ['course_id', 'user_id', 'status', 'created_at'],
    measurable: ['id'],
    default_time_field: 'created_at',
    scoped_by_company: false,
  },
  certificates: {
    label: 'Certificates',
    description: 'Certificates awarded',
    dimensions: ['user_id', 'course_id', 'created_at'],
    measurable: ['id'],
    default_time_field: 'created_at',
    scoped_by_company: false,
  },
  ai_conversations: {
    label: 'AI conversations',
    description: 'Agent conversations',
    dimensions: ['user_id', 'agent_id', 'is_active', 'created_at'],
    measurable: ['id'],
    default_time_field: 'created_at',
    scoped_by_company: false,
  },
  ai_execution_runs: {
    label: 'AI runs',
    description: 'Agent execution runs',
    dimensions: ['conversation_id', 'status', 'started_at'],
    measurable: ['id'],
    default_time_field: 'started_at',
    scoped_by_company: false,
  },
  meta_campaigns: {
    label: 'Meta campaigns',
    description: 'Synced ad campaigns from Meta',
    dimensions: ['status', 'objective', 'company_id', 'created_at'],
    measurable: ['id', 'spend'],
    default_time_field: 'created_at',
    scoped_by_company: true,
  },
  meta_ads: {
    label: 'Meta ads',
    description: 'Synced ads from Meta',
    dimensions: ['status', 'ad_set_id', 'company_id', 'created_at'],
    measurable: ['id', 'impressions', 'clicks', 'spend'],
    default_time_field: 'created_at',
    scoped_by_company: true,
  },
  blog_posts: {
    label: 'Blog posts',
    description: 'Published blog posts',
    dimensions: ['status', 'author_id', 'published_at', 'created_at'],
    measurable: ['id'],
    default_time_field: 'created_at',
    scoped_by_company: false,
  },
  knowledge_documents: {
    label: 'Knowledge documents',
    description: 'Markdown notes in the knowledge base',
    dimensions: ['folder_id', 'company_id', 'created_at', 'last_ingested_at'],
    measurable: ['id'],
    default_time_field: 'created_at',
    scoped_by_company: true,
  },
  knowledge_chunks: {
    label: 'Knowledge chunks',
    description: 'Embedded chunks of knowledge documents',
    dimensions: ['document_id', 'company_id', 'created_at'],
    measurable: ['id'],
    default_time_field: 'created_at',
    scoped_by_company: true,
  },
}

export const DASHBOARD_ENTITIES = Object.keys(DASHBOARD_ALLOWLIST)

export const VALID_AGGREGATIONS: Aggregation[] = [
  'count',
  'sum',
  'avg',
  'min',
  'max',
]

export function isAllowedField(entity: string, field: string): boolean {
  const def = DASHBOARD_ALLOWLIST[entity]
  if (!def) return false
  return (
    def.dimensions.includes(field) ||
    def.measurable.includes(field) ||
    field === def.default_time_field
  )
}
