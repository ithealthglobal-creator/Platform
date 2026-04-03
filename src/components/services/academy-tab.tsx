'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import { Course, ServiceAcademyLink } from '@/lib/types'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { TrashCan } from '@carbon/icons-react'

interface AcademyTabProps {
  serviceId: string
}

export function AcademyTab({ serviceId }: AcademyTabProps) {
  const [allCourses, setAllCourses] = useState<Course[]>([])
  const [linked, setLinked] = useState<ServiceAcademyLink[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const [coursesResult, linkedResult] = await Promise.all([
      supabase
        .from('courses')
        .select('*, phase:phases(name)')
        .eq('is_published', true)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('service_academy_links')
        .select('*, course:courses(*, phase:phases(name))')
        .eq('service_id', serviceId),
    ])

    if (coursesResult.error) {
      toast.error('Failed to load courses')
      setLoading(false)
      return
    }

    if (linkedResult.error) {
      toast.error('Failed to load linked courses')
      setLoading(false)
      return
    }

    setAllCourses((coursesResult.data as Course[]) ?? [])
    setLinked((linkedResult.data as ServiceAcademyLink[]) ?? [])
    setLoading(false)
  }, [serviceId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const linkedIds = new Set(linked.map((l) => l.course_id))
  const availableCourses = allCourses.filter((c) => !linkedIds.has(c.id))

  async function handleAdd(courseId: string) {
    if (!courseId) return

    const { error } = await supabase
      .from('service_academy_links')
      .insert({ service_id: serviceId, course_id: courseId, is_required: false })

    if (error) {
      toast.error('Failed to link course')
      return
    }

    const course = allCourses.find((c) => c.id === courseId)
    if (course) {
      setLinked((prev) => [
        ...prev,
        { service_id: serviceId, course_id: courseId, is_required: false, course },
      ])
    }
  }

  async function handleRemove(courseId: string) {
    const { error } = await supabase
      .from('service_academy_links')
      .delete()
      .eq('service_id', serviceId)
      .eq('course_id', courseId)

    if (error) {
      toast.error('Failed to remove course')
      return
    }

    setLinked((prev) => prev.filter((l) => l.course_id !== courseId))
  }

  async function handleToggleRequired(courseId: string, isRequired: boolean) {
    const { error } = await supabase
      .from('service_academy_links')
      .update({ is_required: isRequired })
      .eq('service_id', serviceId)
      .eq('course_id', courseId)

    if (error) {
      toast.error('Failed to update required status')
      return
    }

    setLinked((prev) =>
      prev.map((l) =>
        l.course_id === courseId ? { ...l, is_required: isRequired } : l
      )
    )
  }

  if (loading) return null

  return (
    <div className="max-w-4xl space-y-4 pt-4">
      <div className="grid gap-2 max-w-md">
        <Label>Link Course</Label>
        <div className="relative">
          <select
            className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
            value=""
            onChange={(e) => {
              handleAdd(e.target.value)
              e.target.value = ''
            }}
          >
            <option value="" disabled>
              Select a course...
            </option>
            {availableCourses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {linked.length > 0 && (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left font-medium">Name</th>
                <th className="px-4 py-2 text-left font-medium">Phase</th>
                <th className="px-4 py-2 text-center font-medium">Required</th>
                <th className="px-4 py-2 text-right font-medium w-16"></th>
              </tr>
            </thead>
            <tbody>
              {linked.map((link) => (
                <tr key={link.course_id} className="border-b last:border-0">
                  <td className="px-4 py-2">{link.course?.name ?? '—'}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {link.course?.phase?.name ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={link.is_required}
                      onChange={(e) =>
                        handleToggleRequired(link.course_id, e.target.checked)
                      }
                      className="h-4 w-4 rounded border-input"
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemove(link.course_id)}
                      className="inline-flex items-center justify-center rounded-md p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <TrashCan size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {linked.length === 0 && (
        <p className="text-sm text-muted-foreground py-4">
          No courses linked yet. Use the dropdown above to link courses.
        </p>
      )}
    </div>
  )
}
