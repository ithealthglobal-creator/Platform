'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { Course, CourseSection, Phase } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Save, Add } from '@carbon/icons-react'
import { SectionEditor } from '@/components/academy/section-editor'

export default function CourseEditorPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const isNew = id === 'new'

  const [courseId, setCourseId] = useState<string | null>(isNew ? null : id)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [phaseId, setPhaseId] = useState<string>('')
  const [isPublished, setIsPublished] = useState(false)
  const [isActive, setIsActive] = useState(true)

  // Sections
  const [sections, setSections] = useState<CourseSection[]>([])
  const [addingSection, setAddingSection] = useState(false)

  // Phases for dropdown
  const [phases, setPhases] = useState<Phase[]>([])

  const fetchPhases = useCallback(async () => {
    const { data, error } = await supabase
      .from('phases')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')

    if (error) {
      toast.error('Failed to load phases')
      return
    }

    setPhases(data ?? [])
  }, [])

  const fetchCourse = useCallback(async () => {
    if (isNew) return

    setLoading(true)
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      toast.error('Failed to load course')
      setLoading(false)
      return
    }

    const course = data as Course
    setName(course.name)
    setDescription(course.description ?? '')
    setPhaseId(course.phase_id ?? '')
    setIsPublished(course.is_published)
    setIsActive(course.is_active)
    setCourseId(course.id)
    setLoading(false)
  }, [id, isNew])

  const fetchSections = useCallback(async () => {
    if (!courseId) return

    const { data, error } = await supabase
      .from('course_sections')
      .select('*')
      .eq('course_id', courseId)
      .order('sort_order')

    if (error) {
      toast.error('Failed to load sections')
      return
    }

    setSections((data as CourseSection[]) ?? [])
  }, [courseId])

  useEffect(() => {
    fetchPhases()
    fetchCourse()
  }, [fetchPhases, fetchCourse])

  useEffect(() => {
    fetchSections()
  }, [fetchSections])

  async function addSection() {
    if (!courseId) return

    setAddingSection(true)

    const nextOrder = sections.length > 0
      ? Math.max(...sections.map((s) => s.sort_order)) + 1
      : 1

    const { error } = await supabase
      .from('course_sections')
      .insert({
        course_id: courseId,
        name: 'New Section',
        sort_order: nextOrder,
      })

    if (error) {
      toast.error('Failed to add section')
      setAddingSection(false)
      return
    }

    toast.success('Section added')
    setAddingSection(false)
    fetchSections()
  }

  async function deleteSection(sectionId: string) {
    const { error } = await supabase
      .from('course_sections')
      .delete()
      .eq('id', sectionId)

    if (error) {
      toast.error('Failed to delete section')
      return
    }

    toast.success('Section deleted')
    fetchSections()
  }

  async function handleSave() {
    const trimmedName = name.trim()
    if (!trimmedName) {
      toast.error('Course name is required')
      return
    }

    setSaving(true)

    const payload = {
      name: trimmedName,
      description: description.trim() || null,
      phase_id: phaseId || null,
      is_published: isPublished,
      is_active: isActive,
    }

    if (courseId) {
      // Update existing course
      const { error } = await supabase
        .from('courses')
        .update(payload)
        .eq('id', courseId)

      if (error) {
        toast.error('Failed to update course')
        setSaving(false)
        return
      }

      toast.success('Course updated successfully')
    } else {
      // Create new course
      const { data, error } = await supabase
        .from('courses')
        .insert(payload)
        .select()
        .single()

      if (error) {
        toast.error('Failed to create course')
        setSaving(false)
        return
      }

      const newCourse = data as Course
      setCourseId(newCourse.id)
      toast.success('Course created successfully')
      router.replace(`/academy/courses/${newCourse.id}/edit`)
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <div>
        <p className="text-muted-foreground py-8 text-center">Loading...</p>
      </div>
    )
  }

  return (
    <div>
      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="sections" disabled={!courseId}>
            Sections
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="max-w-2xl space-y-6 pt-4">
            <div className="grid gap-2">
              <Label htmlFor="course-name">Name</Label>
              <Input
                id="course-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Course name"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="course-description">Description</Label>
              <textarea
                id="course-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Course description"
                rows={4}
                className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="course-phase">Phase</Label>
              <Select
                value={phaseId}
                onValueChange={(val) => setPhaseId(val as string)}
              >
                <SelectTrigger id="course-phase">
                  <SelectValue placeholder="Select a phase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {phases.map((phase) => (
                    <SelectItem key={phase.id} value={phase.id}>
                      {phase.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="course-published"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                <Label htmlFor="course-published">Published</Label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="course-active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                <Label htmlFor="course-active">Active</Label>
              </div>
            </div>

            <div className="pt-2">
              <Button onClick={handleSave} disabled={saving}>
                <Save size={16} />
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="sections">
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Sections</h2>
              <Button onClick={addSection} disabled={addingSection} size="sm">
                <Add size={16} />
                {addingSection ? 'Adding...' : 'Add Section'}
              </Button>
            </div>

            {sections.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                No sections yet. Add one to get started.
              </p>
            ) : (
              sections.map((section) => (
                <SectionEditor
                  key={section.id}
                  section={section}
                  onUpdate={fetchSections}
                  onDelete={deleteSection}
                />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
