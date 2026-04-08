'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'
import { View } from '@carbon/icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'
import { SectionEditor } from '@/components/cms/section-editor'
import { ImageField } from '@/components/cms/image-field'
import { RepeatableItems } from '@/components/cms/repeatable-items'
import { DEFAULT_CONTENT } from '@/lib/default-content'

// ─── Types ───────────────────────────────────────────────────────────────────

interface SectionState {
  content: Record<string, unknown>
  sort_order: number
  is_active: boolean
}

type PageState = Record<string, SectionState>
type CmsState = Record<string, PageState>

const PAGES = ['home', 'about', 'features', 'contact', 'partners'] as const
type PageKey = (typeof PAGES)[number]

const PAGE_LABELS: Record<PageKey, string> = {
  home: 'Home',
  about: 'About',
  features: 'Features',
  contact: 'Contact',
  partners: 'Partners',
}

// Public URL map for preview
const PAGE_ROUTES: Record<PageKey, string> = {
  home: '/',
  about: '/about',
  features: '/features',
  contact: '/contact',
  partners: '/partners',
}

// ─── Field Helpers ────────────────────────────────────────────────────────────

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-1.5">{children}</div>
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label className="font-poppins text-xs font-medium text-gray-600">
      {children}
    </Label>
  )
}

function TextField({
  label,
  value,
  onChange,
  multiline = false,
  rows = 3,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  multiline?: boolean
  rows?: number
}) {
  return (
    <FieldRow>
      <FieldLabel>{label}</FieldLabel>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          className="w-full rounded-md border border-gray-200 px-3 py-2 font-poppins text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
        />
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-poppins text-sm"
        />
      )}
    </FieldRow>
  )
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <FieldRow>
      <FieldLabel>{label}</FieldLabel>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="font-poppins text-sm w-24"
      />
    </FieldRow>
  )
}

function ToggleField({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center gap-3">
      <FieldLabel>{label}</FieldLabel>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={[
          'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
          value ? 'bg-blue-600' : 'bg-gray-200',
        ].join(' ')}
      >
        <span
          className={[
            'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200',
            value ? 'translate-x-4' : 'translate-x-0',
          ].join(' ')}
        />
      </button>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function WebsiteCmsPage() {
  const { profile } = useAuth()
  const [cms, setCms] = useState<CmsState>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<PageKey | null>(null)
  const [activeTab, setActiveTab] = useState<string>('home')

  // ── Load ─────────────────────────────────────────────────────────────────

  const loadContent = useCallback(async () => {
    if (!profile?.company_id) return
    setLoading(true)

    const { data, error } = await supabase
      .from('website_content')
      .select('*')
      .eq('company_id', profile.company_id)

    if (error) {
      toast.error('Failed to load website content')
      setLoading(false)
      return
    }

    // Build state from DB rows, merged with DEFAULT_CONTENT
    const state: CmsState = {}

    for (const page of PAGES) {
      state[page] = {}
      const defaults = DEFAULT_CONTENT[page] ?? {}

      for (const [section, defaultContent] of Object.entries(defaults)) {
        const row = (data ?? []).find(
          (r) => r.page === page && r.section === section
        )
        state[page][section] = {
          content: (row?.content as Record<string, unknown>) ?? (defaultContent as Record<string, unknown>),
          sort_order: row?.sort_order ?? 0,
          is_active: row?.is_active ?? true,
        }
      }
    }

    setCms(state)
    setLoading(false)
  }, [profile?.company_id])

  useEffect(() => {
    loadContent()
  }, [loadContent])

  // ── Helpers ───────────────────────────────────────────────────────────────

  function updateField(
    page: string,
    section: string,
    field: string,
    value: unknown
  ) {
    setCms((prev) => ({
      ...prev,
      [page]: {
        ...prev[page],
        [section]: {
          ...prev[page]?.[section],
          content: {
            ...prev[page]?.[section]?.content,
            [field]: value,
          },
        },
      },
    }))
  }

  function updateSectionMeta(
    page: string,
    section: string,
    key: 'sort_order' | 'is_active',
    value: unknown
  ) {
    setCms((prev) => ({
      ...prev,
      [page]: {
        ...prev[page],
        [section]: {
          ...prev[page]?.[section],
          [key]: value,
        },
      },
    }))
  }

  function getContent(page: string, section: string): Record<string, unknown> {
    return cms[page]?.[section]?.content ?? {}
  }

  function str(page: string, section: string, field: string): string {
    const v = getContent(page, section)[field]
    return typeof v === 'string' ? v : ''
  }

  function num(page: string, section: string, field: string): number {
    const v = getContent(page, section)[field]
    return typeof v === 'number' ? v : 0
  }

  function bool(page: string, section: string, field: string): boolean {
    const v = getContent(page, section)[field]
    return typeof v === 'boolean' ? v : false
  }

  function arr<T>(page: string, section: string, field: string): T[] {
    const v = getContent(page, section)[field]
    return Array.isArray(v) ? (v as T[]) : []
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function savePage(page: PageKey) {
    if (!profile?.company_id) return
    setSaving(page)

    const sections = cms[page] ?? {}
    const rows = Object.entries(sections).map(([section, state]) => ({
      company_id: profile.company_id,
      page,
      section,
      content: state.content,
      sort_order: state.sort_order,
      is_active: state.is_active,
    }))

    const { error } = await supabase
      .from('website_content')
      .upsert(rows, { onConflict: 'company_id,page,section' })

    setSaving(null)

    if (error) {
      toast.error(`Failed to save ${PAGE_LABELS[page]} page`)
      return
    }

    toast.success(`${PAGE_LABELS[page]} page saved`)
  }

  // ── Section renderers ─────────────────────────────────────────────────────

  function renderCTASection(page: string) {
    return (
      <SectionEditor
        title="CTA"
        isActive={cms[page]?.cta?.is_active ?? true}
        onToggleActive={(v) => updateSectionMeta(page, 'cta', 'is_active', v)}
        sortOrder={cms[page]?.cta?.sort_order ?? 0}
        onSortOrderChange={(v) => updateSectionMeta(page, 'cta', 'sort_order', v)}
      >
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Heading" value={str(page, 'cta', 'heading')} onChange={(v) => updateField(page, 'cta', 'heading', v)} />
          <TextField label="Subheading" value={str(page, 'cta', 'subheading')} onChange={(v) => updateField(page, 'cta', 'subheading', v)} />
          <TextField label="Button Text" value={str(page, 'cta', 'button_text')} onChange={(v) => updateField(page, 'cta', 'button_text', v)} />
          <TextField label="Button Link" value={str(page, 'cta', 'button_link')} onChange={(v) => updateField(page, 'cta', 'button_link', v)} />
        </div>
      </SectionEditor>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {PAGES.map((page) => (
            <TabsTrigger key={page} value={page}>
              {PAGE_LABELS[page]}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── HOME ── */}
        <TabsContent value="home">
          <div className="flex flex-col gap-4 pt-4">
            {/* Hero */}
            <SectionEditor
              title="Hero"
              isActive={cms.home?.hero?.is_active ?? true}
              onToggleActive={(v) => updateSectionMeta('home', 'hero', 'is_active', v)}
              sortOrder={cms.home?.hero?.sort_order ?? 0}
              onSortOrderChange={(v) => updateSectionMeta('home', 'hero', 'sort_order', v)}
            >
              <div className="grid grid-cols-2 gap-4">
                <TextField label="Title" value={str('home', 'hero', 'title')} onChange={(v) => updateField('home', 'hero', 'title', v)} />
                <TextField label="CTA Text" value={str('home', 'hero', 'cta_text')} onChange={(v) => updateField('home', 'hero', 'cta_text', v)} />
                <TextField label="Subtitle" value={str('home', 'hero', 'subtitle')} onChange={(v) => updateField('home', 'hero', 'subtitle', v)} multiline />
                <TextField label="CTA Link" value={str('home', 'hero', 'cta_link')} onChange={(v) => updateField('home', 'hero', 'cta_link', v)} />
              </div>
            </SectionEditor>

            {/* Mission */}
            <SectionEditor
              title="Mission"
              isActive={cms.home?.mission?.is_active ?? true}
              onToggleActive={(v) => updateSectionMeta('home', 'mission', 'is_active', v)}
              sortOrder={cms.home?.mission?.sort_order ?? 0}
              onSortOrderChange={(v) => updateSectionMeta('home', 'mission', 'sort_order', v)}
            >
              <TextField label="Body" value={str('home', 'mission', 'body')} onChange={(v) => updateField('home', 'mission', 'body', v)} multiline rows={4} />
            </SectionEditor>

            {/* Journey */}
            <SectionEditor
              title="Journey"
              isActive={cms.home?.journey?.is_active ?? true}
              onToggleActive={(v) => updateSectionMeta('home', 'journey', 'is_active', v)}
              sortOrder={cms.home?.journey?.sort_order ?? 0}
              onSortOrderChange={(v) => updateSectionMeta('home', 'journey', 'sort_order', v)}
            >
              <div className="grid grid-cols-2 gap-4">
                <TextField label="Heading" value={str('home', 'journey', 'heading')} onChange={(v) => updateField('home', 'journey', 'heading', v)} />
                <TextField label="Subheading" value={str('home', 'journey', 'subheading')} onChange={(v) => updateField('home', 'journey', 'subheading', v)} multiline />
                <div className="col-span-2">
                  <ToggleField label="Show Phases" value={bool('home', 'journey', 'show_phases')} onChange={(v) => updateField('home', 'journey', 'show_phases', v)} />
                </div>
              </div>
            </SectionEditor>

            {/* Team Banner */}
            <SectionEditor
              title="Team Banner"
              isActive={cms.home?.team_banner?.is_active ?? true}
              onToggleActive={(v) => updateSectionMeta('home', 'team_banner', 'is_active', v)}
              sortOrder={cms.home?.team_banner?.sort_order ?? 0}
              onSortOrderChange={(v) => updateSectionMeta('home', 'team_banner', 'sort_order', v)}
            >
              <div className="grid grid-cols-2 gap-4">
                {profile?.company_id && (
                  <ImageField
                    label="Image"
                    value={str('home', 'team_banner', 'image_url') || null}
                    companyId={profile.company_id}
                    path="home/team-banner"
                    onUploaded={(url) => updateField('home', 'team_banner', 'image_url', url)}
                  />
                )}
                <TextField label="Alt Text" value={str('home', 'team_banner', 'alt_text')} onChange={(v) => updateField('home', 'team_banner', 'alt_text', v)} />
              </div>
            </SectionEditor>

            {/* Platform Showcase */}
            <SectionEditor
              title="Platform Showcase"
              isActive={cms.home?.platform_showcase?.is_active ?? true}
              onToggleActive={(v) => updateSectionMeta('home', 'platform_showcase', 'is_active', v)}
              sortOrder={cms.home?.platform_showcase?.sort_order ?? 0}
              onSortOrderChange={(v) => updateSectionMeta('home', 'platform_showcase', 'sort_order', v)}
            >
              <div className="grid grid-cols-2 gap-4">
                <TextField label="Eyebrow" value={str('home', 'platform_showcase', 'eyebrow')} onChange={(v) => updateField('home', 'platform_showcase', 'eyebrow', v)} />
                <TextField label="Heading" value={str('home', 'platform_showcase', 'heading')} onChange={(v) => updateField('home', 'platform_showcase', 'heading', v)} />
                <TextField label="Description" value={str('home', 'platform_showcase', 'description')} onChange={(v) => updateField('home', 'platform_showcase', 'description', v)} multiline />
                {profile?.company_id && (
                  <ImageField
                    label="Image"
                    value={str('home', 'platform_showcase', 'image_url') || null}
                    companyId={profile.company_id}
                    path="home/platform-showcase"
                    onUploaded={(url) => updateField('home', 'platform_showcase', 'image_url', url)}
                  />
                )}
              </div>
            </SectionEditor>

            {/* Testimonials */}
            <SectionEditor
              title="Testimonials"
              isActive={cms.home?.testimonials?.is_active ?? true}
              onToggleActive={(v) => updateSectionMeta('home', 'testimonials', 'is_active', v)}
              sortOrder={cms.home?.testimonials?.sort_order ?? 0}
              onSortOrderChange={(v) => updateSectionMeta('home', 'testimonials', 'sort_order', v)}
            >
              <div className="flex flex-col gap-4">
                <TextField label="Section Heading" value={str('home', 'testimonials', 'heading')} onChange={(v) => updateField('home', 'testimonials', 'heading', v)} />
                <RepeatableItems
                  items={arr<{ quote: string; author: string; role: string; company: string }>('home', 'testimonials', 'items')}
                  onItemsChange={(items) => updateField('home', 'testimonials', 'items', items)}
                  createEmpty={() => ({ quote: '', author: '', role: '', company: '' })}
                  addLabel="Add Testimonial"
                  renderItem={(item, _index, onChange) => (
                    <div className="grid grid-cols-2 gap-3">
                      <TextField label="Quote" value={item.quote} onChange={(v) => onChange('quote', v)} multiline rows={2} />
                      <TextField label="Author" value={item.author} onChange={(v) => onChange('author', v)} />
                      <TextField label="Role" value={item.role} onChange={(v) => onChange('role', v)} />
                      <TextField label="Company" value={item.company} onChange={(v) => onChange('company', v)} />
                    </div>
                  )}
                />
              </div>
            </SectionEditor>

            {/* Blog Preview */}
            <SectionEditor
              title="Blog Preview"
              isActive={cms.home?.blog_preview?.is_active ?? true}
              onToggleActive={(v) => updateSectionMeta('home', 'blog_preview', 'is_active', v)}
              sortOrder={cms.home?.blog_preview?.sort_order ?? 0}
              onSortOrderChange={(v) => updateSectionMeta('home', 'blog_preview', 'sort_order', v)}
            >
              <div className="grid grid-cols-2 gap-4">
                <TextField label="Heading" value={str('home', 'blog_preview', 'heading')} onChange={(v) => updateField('home', 'blog_preview', 'heading', v)} />
                <TextField label="Subheading" value={str('home', 'blog_preview', 'subheading')} onChange={(v) => updateField('home', 'blog_preview', 'subheading', v)} />
                <NumberField label="Post Count" value={num('home', 'blog_preview', 'count')} onChange={(v) => updateField('home', 'blog_preview', 'count', v)} />
              </div>
            </SectionEditor>

            {/* CTA */}
            {renderCTASection('home')}

            <PageActions page="home" saving={saving} onSave={savePage} />
          </div>
        </TabsContent>

        {/* ── ABOUT ── */}
        <TabsContent value="about">
          <div className="flex flex-col gap-4 pt-4">
            {/* Hero */}
            <SectionEditor
              title="Hero"
              isActive={cms.about?.hero?.is_active ?? true}
              onToggleActive={(v) => updateSectionMeta('about', 'hero', 'is_active', v)}
              sortOrder={cms.about?.hero?.sort_order ?? 0}
              onSortOrderChange={(v) => updateSectionMeta('about', 'hero', 'sort_order', v)}
            >
              <div className="grid grid-cols-2 gap-4">
                <TextField label="Title" value={str('about', 'hero', 'title')} onChange={(v) => updateField('about', 'hero', 'title', v)} />
                <TextField label="Subtitle" value={str('about', 'hero', 'subtitle')} onChange={(v) => updateField('about', 'hero', 'subtitle', v)} />
              </div>
            </SectionEditor>

            {/* Mission */}
            <SectionEditor
              title="Mission"
              isActive={cms.about?.mission?.is_active ?? true}
              onToggleActive={(v) => updateSectionMeta('about', 'mission', 'is_active', v)}
              sortOrder={cms.about?.mission?.sort_order ?? 0}
              onSortOrderChange={(v) => updateSectionMeta('about', 'mission', 'sort_order', v)}
            >
              <div className="grid grid-cols-2 gap-4">
                <TextField label="Eyebrow" value={str('about', 'mission', 'eyebrow')} onChange={(v) => updateField('about', 'mission', 'eyebrow', v)} />
                <TextField label="Heading" value={str('about', 'mission', 'heading')} onChange={(v) => updateField('about', 'mission', 'heading', v)} />
                <div className="col-span-2">
                  <FieldLabel>Paragraphs</FieldLabel>
                  <RepeatableItems
                    items={arr<string>('about', 'mission', 'paragraphs')}
                    onItemsChange={(items) => updateField('about', 'mission', 'paragraphs', items)}
                    createEmpty={() => ''}
                    addLabel="Add Paragraph"
                    renderItem={(item, _index, onChange) => (
                      <textarea
                        value={item as unknown as string}
                        onChange={(e) => onChange('', e.target.value)}
                        rows={3}
                        className="w-full rounded-md border border-gray-200 px-3 py-2 font-poppins text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
                      />
                    )}
                  />
                </div>
                {profile?.company_id && (
                  <ImageField
                    label="Image"
                    value={str('about', 'mission', 'image_url') || null}
                    companyId={profile.company_id}
                    path="about/mission"
                    onUploaded={(url) => updateField('about', 'mission', 'image_url', url)}
                  />
                )}
              </div>
            </SectionEditor>

            {/* Values */}
            <SectionEditor
              title="Values"
              isActive={cms.about?.values?.is_active ?? true}
              onToggleActive={(v) => updateSectionMeta('about', 'values', 'is_active', v)}
              sortOrder={cms.about?.values?.sort_order ?? 0}
              onSortOrderChange={(v) => updateSectionMeta('about', 'values', 'sort_order', v)}
            >
              <RepeatableItems
                items={arr<{ icon: string; title: string; description: string }>('about', 'values', 'items')}
                onItemsChange={(items) => updateField('about', 'values', 'items', items)}
                createEmpty={() => ({ icon: '', title: '', description: '' })}
                addLabel="Add Value"
                renderItem={(item, _index, onChange) => (
                  <div className="grid grid-cols-2 gap-3">
                    <TextField label="Icon" value={item.icon} onChange={(v) => onChange('icon', v)} />
                    <TextField label="Title" value={item.title} onChange={(v) => onChange('title', v)} />
                    <div className="col-span-2">
                      <TextField label="Description" value={item.description} onChange={(v) => onChange('description', v)} multiline rows={2} />
                    </div>
                  </div>
                )}
              />
            </SectionEditor>

            {/* CTA */}
            {renderCTASection('about')}

            <PageActions page="about" saving={saving} onSave={savePage} />
          </div>
        </TabsContent>

        {/* ── FEATURES ── */}
        <TabsContent value="features">
          <div className="flex flex-col gap-4 pt-4">
            {/* Hero */}
            <SectionEditor
              title="Hero"
              isActive={cms.features?.hero?.is_active ?? true}
              onToggleActive={(v) => updateSectionMeta('features', 'hero', 'is_active', v)}
              sortOrder={cms.features?.hero?.sort_order ?? 0}
              onSortOrderChange={(v) => updateSectionMeta('features', 'hero', 'sort_order', v)}
            >
              <div className="grid grid-cols-2 gap-4">
                <TextField label="Title" value={str('features', 'hero', 'title')} onChange={(v) => updateField('features', 'hero', 'title', v)} />
                <TextField label="Subtitle" value={str('features', 'hero', 'subtitle')} onChange={(v) => updateField('features', 'hero', 'subtitle', v)} multiline />
              </div>
            </SectionEditor>

            {/* Features */}
            <SectionEditor
              title="Features"
              isActive={cms.features?.features?.is_active ?? true}
              onToggleActive={(v) => updateSectionMeta('features', 'features', 'is_active', v)}
              sortOrder={cms.features?.features?.sort_order ?? 0}
              onSortOrderChange={(v) => updateSectionMeta('features', 'features', 'sort_order', v)}
            >
              <RepeatableItems
                items={arr<{ icon: string; title: string; description: string }>('features', 'features', 'items')}
                onItemsChange={(items) => updateField('features', 'features', 'items', items)}
                createEmpty={() => ({ icon: '', title: '', description: '' })}
                addLabel="Add Feature"
                renderItem={(item, _index, onChange) => (
                  <div className="grid grid-cols-2 gap-3">
                    <TextField label="Icon" value={item.icon} onChange={(v) => onChange('icon', v)} />
                    <TextField label="Title" value={item.title} onChange={(v) => onChange('title', v)} />
                    <div className="col-span-2">
                      <TextField label="Description" value={item.description} onChange={(v) => onChange('description', v)} multiline rows={2} />
                    </div>
                  </div>
                )}
              />
            </SectionEditor>

            {/* Detail */}
            <SectionEditor
              title="Detail"
              isActive={cms.features?.detail?.is_active ?? true}
              onToggleActive={(v) => updateSectionMeta('features', 'detail', 'is_active', v)}
              sortOrder={cms.features?.detail?.sort_order ?? 0}
              onSortOrderChange={(v) => updateSectionMeta('features', 'detail', 'sort_order', v)}
            >
              <div className="grid grid-cols-2 gap-4">
                <TextField label="Heading" value={str('features', 'detail', 'heading')} onChange={(v) => updateField('features', 'detail', 'heading', v)} />
                <TextField label="Body" value={str('features', 'detail', 'body')} onChange={(v) => updateField('features', 'detail', 'body', v)} multiline />
                {profile?.company_id && (
                  <ImageField
                    label="Image"
                    value={str('features', 'detail', 'image_url') || null}
                    companyId={profile.company_id}
                    path="features/detail"
                    onUploaded={(url) => updateField('features', 'detail', 'image_url', url)}
                  />
                )}
              </div>
            </SectionEditor>

            {/* CTA */}
            {renderCTASection('features')}

            <PageActions page="features" saving={saving} onSave={savePage} />
          </div>
        </TabsContent>

        {/* ── CONTACT ── */}
        <TabsContent value="contact">
          <div className="flex flex-col gap-4 pt-4">
            {/* Hero */}
            <SectionEditor
              title="Hero"
              isActive={cms.contact?.hero?.is_active ?? true}
              onToggleActive={(v) => updateSectionMeta('contact', 'hero', 'is_active', v)}
              sortOrder={cms.contact?.hero?.sort_order ?? 0}
              onSortOrderChange={(v) => updateSectionMeta('contact', 'hero', 'sort_order', v)}
            >
              <div className="grid grid-cols-2 gap-4">
                <TextField label="Title" value={str('contact', 'hero', 'title')} onChange={(v) => updateField('contact', 'hero', 'title', v)} />
                <TextField label="Subtitle" value={str('contact', 'hero', 'subtitle')} onChange={(v) => updateField('contact', 'hero', 'subtitle', v)} />
              </div>
            </SectionEditor>

            {/* Info */}
            <SectionEditor
              title="Contact Info"
              isActive={cms.contact?.info?.is_active ?? true}
              onToggleActive={(v) => updateSectionMeta('contact', 'info', 'is_active', v)}
              sortOrder={cms.contact?.info?.sort_order ?? 0}
              onSortOrderChange={(v) => updateSectionMeta('contact', 'info', 'sort_order', v)}
            >
              <div className="grid grid-cols-2 gap-4">
                <TextField label="Email" value={str('contact', 'info', 'email')} onChange={(v) => updateField('contact', 'info', 'email', v)} />
                <TextField label="Phone" value={str('contact', 'info', 'phone')} onChange={(v) => updateField('contact', 'info', 'phone', v)} />
                <TextField label="Address" value={str('contact', 'info', 'address')} onChange={(v) => updateField('contact', 'info', 'address', v)} />
              </div>
            </SectionEditor>

            {/* Form */}
            <SectionEditor
              title="Contact Form"
              isActive={cms.contact?.form?.is_active ?? true}
              onToggleActive={(v) => updateSectionMeta('contact', 'form', 'is_active', v)}
              sortOrder={cms.contact?.form?.sort_order ?? 0}
              onSortOrderChange={(v) => updateSectionMeta('contact', 'form', 'sort_order', v)}
            >
              <div className="flex flex-col gap-4">
                <TextField label="Form Heading" value={str('contact', 'form', 'heading')} onChange={(v) => updateField('contact', 'form', 'heading', v)} />
                <div>
                  <FieldLabel>Form Fields</FieldLabel>
                  <div className="mt-2">
                    <RepeatableItems
                      items={arr<string>('contact', 'form', 'fields')}
                      onItemsChange={(items) => updateField('contact', 'form', 'fields', items)}
                      createEmpty={() => ''}
                      addLabel="Add Field"
                      renderItem={(item, _index, onChange) => (
                        <Input
                          value={item as unknown as string}
                          onChange={(e) => onChange('', e.target.value)}
                          placeholder="field_name"
                          className="font-poppins text-sm"
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
            </SectionEditor>

            <PageActions page="contact" saving={saving} onSave={savePage} />
          </div>
        </TabsContent>

        {/* ── PARTNERS ── */}
        <TabsContent value="partners">
          <div className="flex flex-col gap-4 pt-4">
            {/* Hero */}
            <SectionEditor
              title="Hero"
              isActive={cms.partners?.hero?.is_active ?? true}
              onToggleActive={(v) => updateSectionMeta('partners', 'hero', 'is_active', v)}
              sortOrder={cms.partners?.hero?.sort_order ?? 0}
              onSortOrderChange={(v) => updateSectionMeta('partners', 'hero', 'sort_order', v)}
            >
              <div className="grid grid-cols-2 gap-4">
                <TextField label="Title" value={str('partners', 'hero', 'title')} onChange={(v) => updateField('partners', 'hero', 'title', v)} />
                <TextField label="Subtitle" value={str('partners', 'hero', 'subtitle')} onChange={(v) => updateField('partners', 'hero', 'subtitle', v)} />
              </div>
            </SectionEditor>

            {/* Benefits */}
            <SectionEditor
              title="Benefits"
              isActive={cms.partners?.benefits?.is_active ?? true}
              onToggleActive={(v) => updateSectionMeta('partners', 'benefits', 'is_active', v)}
              sortOrder={cms.partners?.benefits?.sort_order ?? 0}
              onSortOrderChange={(v) => updateSectionMeta('partners', 'benefits', 'sort_order', v)}
            >
              <div className="flex flex-col gap-4">
                <TextField label="Heading" value={str('partners', 'benefits', 'heading')} onChange={(v) => updateField('partners', 'benefits', 'heading', v)} />
                <RepeatableItems
                  items={arr<{ icon: string; title: string; description: string }>('partners', 'benefits', 'items')}
                  onItemsChange={(items) => updateField('partners', 'benefits', 'items', items)}
                  createEmpty={() => ({ icon: '', title: '', description: '' })}
                  addLabel="Add Benefit"
                  renderItem={(item, _index, onChange) => (
                    <div className="grid grid-cols-2 gap-3">
                      <TextField label="Icon" value={item.icon} onChange={(v) => onChange('icon', v)} />
                      <TextField label="Title" value={item.title} onChange={(v) => onChange('title', v)} />
                      <div className="col-span-2">
                        <TextField label="Description" value={item.description} onChange={(v) => onChange('description', v)} multiline rows={2} />
                      </div>
                    </div>
                  )}
                />
              </div>
            </SectionEditor>

            {/* CTA */}
            {renderCTASection('partners')}

            <PageActions page="partners" saving={saving} onSave={savePage} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Page Actions Bar ─────────────────────────────────────────────────────────

function PageActions({
  page,
  saving,
  onSave,
}: {
  page: PageKey
  saving: PageKey | null
  onSave: (page: PageKey) => void
}) {
  const PAGE_ROUTES: Record<PageKey, string> = {
    home: '/',
    about: '/about',
    features: '/features',
    contact: '/contact',
    partners: '/partners',
  }

  return (
    <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => window.open(PAGE_ROUTES[page], '_blank')}
        className="font-poppins"
      >
        <View size={16} className="mr-1.5" />
        Preview
      </Button>
      <Button
        type="button"
        size="sm"
        disabled={saving === page}
        onClick={() => onSave(page)}
        className="font-poppins"
      >
        {saving === page ? (
          <>
            <span className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white inline-block" />
            Saving…
          </>
        ) : (
          'Save Page'
        )}
      </Button>
    </div>
  )
}
