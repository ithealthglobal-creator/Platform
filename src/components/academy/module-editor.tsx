'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import { CourseModule } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Add, Edit, TrashCan } from '@carbon/icons-react'

interface ModuleEditorProps {
  sectionId: string
}

interface ModuleForm {
  title: string
  youtube_url: string
  description: string
  duration_minutes: string
  sort_order: string
}

const emptyForm: ModuleForm = {
  title: '',
  youtube_url: '',
  description: '',
  duration_minutes: '',
  sort_order: '',
}

export function ModuleEditor({ sectionId }: ModuleEditorProps) {
  const [modules, setModules] = useState<CourseModule[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ModuleForm>(emptyForm)
  const [saving, setSaving] = useState(false)

  const fetchModules = useCallback(async () => {
    const { data, error } = await supabase
      .from('course_modules')
      .select('*')
      .eq('section_id', sectionId)
      .order('sort_order')

    if (error) {
      toast.error('Failed to load modules')
      return
    }

    setModules((data as CourseModule[]) ?? [])
    setLoading(false)
  }, [sectionId])

  useEffect(() => {
    fetchModules()
  }, [fetchModules])

  function startAdd() {
    setEditingId(null)
    setForm({
      ...emptyForm,
      sort_order: String(modules.length + 1),
    })
    setShowAddForm(true)
  }

  function startEdit(mod: CourseModule) {
    setShowAddForm(false)
    setEditingId(mod.id)
    setForm({
      title: mod.title,
      youtube_url: mod.youtube_url,
      description: mod.description ?? '',
      duration_minutes: mod.duration_minutes != null ? String(mod.duration_minutes) : '',
      sort_order: String(mod.sort_order),
    })
  }

  function cancelForm() {
    setShowAddForm(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  async function handleSave() {
    const trimmedTitle = form.title.trim()
    const trimmedUrl = form.youtube_url.trim()

    if (!trimmedTitle || !trimmedUrl) {
      toast.error('Title and YouTube URL are required')
      return
    }

    setSaving(true)

    const payload = {
      section_id: sectionId,
      title: trimmedTitle,
      youtube_url: trimmedUrl,
      description: form.description.trim() || null,
      duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
      sort_order: form.sort_order ? Number(form.sort_order) : 0,
    }

    if (editingId) {
      const { error } = await supabase
        .from('course_modules')
        .update(payload)
        .eq('id', editingId)

      if (error) {
        toast.error('Failed to update module')
        setSaving(false)
        return
      }
      toast.success('Module updated')
    } else {
      const { error } = await supabase
        .from('course_modules')
        .insert(payload)

      if (error) {
        toast.error('Failed to create module')
        setSaving(false)
        return
      }
      toast.success('Module created')
    }

    setSaving(false)
    cancelForm()
    fetchModules()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this module?')) return

    const { error } = await supabase
      .from('course_modules')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Failed to delete module')
      return
    }

    toast.success('Module deleted')
    fetchModules()
  }

  function renderForm() {
    return (
      <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
        <div className="grid gap-2">
          <Label>Title *</Label>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Module title"
          />
        </div>
        <div className="grid gap-2">
          <Label>YouTube URL *</Label>
          <Input
            value={form.youtube_url}
            onChange={(e) => setForm({ ...form, youtube_url: e.target.value })}
            placeholder="https://youtube.com/watch?v=..."
          />
        </div>
        <div className="grid gap-2">
          <Label>Description</Label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Module description"
            rows={2}
            className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
          />
        </div>
        <div className="flex gap-4">
          <div className="grid gap-2">
            <Label>Duration (min)</Label>
            <Input
              type="number"
              value={form.duration_minutes}
              onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
              placeholder="0"
              className="w-28"
            />
          </div>
          <div className="grid gap-2">
            <Label>Sort Order</Label>
            <Input
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
              placeholder="0"
              className="w-28"
            />
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button onClick={cancelForm} variant="outline" size="sm">
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading modules...</p>
  }

  return (
    <div className="space-y-3">
      {modules.map((mod) => (
        <div key={mod.id}>
          {editingId === mod.id ? (
            renderForm()
          ) : (
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{mod.title}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <a
                    href={mod.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-foreground"
                  >
                    {mod.youtube_url}
                  </a>
                  {mod.duration_minutes != null && (
                    <span>{mod.duration_minutes} min</span>
                  )}
                  <span>Order: {mod.sort_order}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => startEdit(mod)}
                >
                  <Edit size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(mod.id)}
                >
                  <TrashCan size={16} />
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}

      {showAddForm && renderForm()}

      {!showAddForm && !editingId && (
        <Button variant="outline" size="sm" onClick={startAdd}>
          <Add size={16} />
          Add Module
        </Button>
      )}
    </div>
  )
}
