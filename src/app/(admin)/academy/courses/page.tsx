'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { Breadcrumb } from '@/components/breadcrumb'
import { Course } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Add, Edit, TrashCan } from '@carbon/icons-react'

interface CourseWithDetails extends Course {
  section_count: number
  phase_name: string | null
}

export default function CoursesPage() {
  const router = useRouter()
  const [courses, setCourses] = useState<CourseWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCourses = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('courses')
      .select('*, phase:phases(name), course_sections(count)')
      .order('name')

    if (error) {
      toast.error('Failed to load courses')
      setLoading(false)
      return
    }

    const mapped: CourseWithDetails[] = (data ?? []).map(
      (c: Record<string, unknown>) => ({
        id: c.id as string,
        name: c.name as string,
        description: c.description as string | null,
        phase_id: c.phase_id as string | null,
        service_id: c.service_id as string | null,
        thumbnail_url: c.thumbnail_url as string | null,
        is_published: c.is_published as boolean,
        is_active: c.is_active as boolean,
        created_at: c.created_at as string,
        updated_at: c.updated_at as string,
        phase_name:
          (c.phase as { name: string } | null)?.name ?? null,
        section_count:
          (
            c.course_sections as Array<{ count: number }> | undefined
          )?.[0]?.count ?? 0,
      })
    )

    setCourses(mapped)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchCourses()
  }, [fetchCourses])

  const handleDelete = useCallback(
    async (id: string, name: string) => {
      if (!confirm(`Are you sure you want to delete "${name}"?`)) return

      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', id)

      if (error) {
        toast.error('Failed to delete course')
        return
      }

      toast.success('Course deleted successfully')
      fetchCourses()
    },
    [fetchCourses]
  )

  return (
    <div>
      <Breadcrumb />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Courses</h1>
          <p className="text-muted-foreground text-sm">
            Manage academy courses and their content
          </p>
        </div>
        <Button onClick={() => router.push('/academy/courses/new/edit')}>
          <Add size={16} />
          Add Course
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="w-[140px]">Phase</TableHead>
              <TableHead className="w-[100px]">Sections</TableHead>
              <TableHead className="w-[100px]">Published</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : courses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No courses found
                </TableCell>
              </TableRow>
            ) : (
              courses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell className="font-medium">{course.name}</TableCell>
                  <TableCell>{course.phase_name ?? '—'}</TableCell>
                  <TableCell>{course.section_count}</TableCell>
                  <TableCell>
                    <Badge variant={course.is_published ? 'default' : 'secondary'}>
                      {course.is_published ? 'Yes' : 'No'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={course.is_active ? 'default' : 'secondary'}>
                      {course.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => router.push(`/academy/courses/${course.id}/edit`)}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(course.id, course.name)}
                      >
                        <TrashCan size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
