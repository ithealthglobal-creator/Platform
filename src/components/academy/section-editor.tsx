'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { CourseSection } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { ChevronRight, TrashCan } from '@carbon/icons-react'
import { ModuleEditor } from './module-editor'
import { AssessmentEditor } from './assessment-editor'

interface SectionEditorProps {
  section: CourseSection
  onUpdate: () => void
  onDelete: (id: string) => void
}

export function SectionEditor({ section, onUpdate, onDelete }: SectionEditorProps) {
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)

  // Section form state
  const [name, setName] = useState(section.name)
  const [description, setDescription] = useState(section.description ?? '')
  const [sortOrder, setSortOrder] = useState(String(section.sort_order))

  async function handleSave() {
    const trimmedName = name.trim()
    if (!trimmedName) {
      toast.error('Section name is required')
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from('course_sections')
      .update({
        name: trimmedName,
        description: description.trim() || null,
        sort_order: Number(sortOrder) || 0,
      })
      .eq('id', section.id)

    if (error) {
      toast.error('Failed to update section')
      setSaving(false)
      return
    }

    toast.success('Section updated')
    setSaving(false)
    onUpdate()
  }

  function handleDelete() {
    if (!confirm(`Delete section "${section.name}"? This will also delete all modules and assessments in this section.`)) {
      return
    }
    onDelete(section.id)
  }

  return (
    <div className="rounded-lg border">
      {/* Collapsible header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ChevronRight
            size={16}
            className={`transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
          <span className="font-medium">{section.name}</span>
          <span className="text-xs text-muted-foreground">
            (Order: {section.sort_order})
          </span>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t px-4 py-4 space-y-6">
          {/* Section fields */}
          <div className="space-y-3">
            <div className="grid gap-2">
              <Label>Section Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Section name"
              />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Section description"
                rows={2}
                className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
              />
            </div>
            <div className="grid gap-2">
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-28"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} size="sm">
                {saving ? 'Saving...' : 'Save Section'}
              </Button>
              <Button
                onClick={handleDelete}
                variant="destructive"
                size="sm"
              >
                <TrashCan size={16} />
                Delete Section
              </Button>
            </div>
          </div>

          {/* Pre-Assessment */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold border-b pb-1">Pre-Assessment</h3>
            <AssessmentEditor sectionId={section.id} type="pre" />
          </div>

          {/* Modules */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold border-b pb-1">Modules</h3>
            <ModuleEditor sectionId={section.id} />
          </div>

          {/* Post-Assessment */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold border-b pb-1">Post-Assessment</h3>
            <AssessmentEditor sectionId={section.id} type="post" />
          </div>
        </div>
      )}
    </div>
  )
}
