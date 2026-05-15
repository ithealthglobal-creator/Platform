export type TemplateKind =
  | 'landing_page'
  | 'brochure'
  | 'presentation'
  | 'document'
  | 'website_page'
  | 'social_post'

export type TemplateStatus = 'draft' | 'in_review' | 'published'

export type TemplateBlock =
  | { type: 'eyebrow'; text: string }
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | {
      type: 'hero'
      eyebrow?: string
      title: string
      subtitle?: string
      cta?: string
      bg?: 'blue' | 'dark' | 'white'
    }
  | { type: 'cta_banner'; title: string; subtitle?: string; cta: string }
  | { type: 'columns'; items: Array<{ title: string; body: string }> }
  | { type: 'phase_row' }
  | { type: 'divider' }
  | { type: 'footer_note'; text: string }

export interface TemplateContent {
  blocks: TemplateBlock[]
}

export interface TemplateRow {
  id: string
  company_id: string | null
  name: string
  description: string | null
  kind: TemplateKind
  status: TemplateStatus
  content: TemplateContent
  created_by: string | null
  created_at: string
  updated_at: string
}

export const TEMPLATE_KIND_LABEL: Record<TemplateKind, string> = {
  landing_page: 'Landing page',
  brochure: 'Brochure',
  presentation: 'Presentation',
  document: 'Document',
  website_page: 'Website page',
  social_post: 'Social post',
}

export const TEMPLATE_STATUS_LABEL: Record<TemplateStatus, string> = {
  draft: 'Draft',
  in_review: 'In review',
  published: 'Published',
}
