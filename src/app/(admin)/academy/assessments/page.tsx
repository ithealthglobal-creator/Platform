'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { AssessmentScope } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Add, Edit, TrashCan } from '@carbon/icons-react'

interface AssessmentRow {
  id: string
  name: string
  scope: AssessmentScope
  scope_label: string
  question_count: number
  attempt_count: number
  avg_score: number | null
  is_active: boolean
  is_standalone: boolean
}

function scopeBadgeVariant(scope: AssessmentScope): 'default' | 'secondary' | 'outline' {
  switch (scope) {
    case 'journey': return 'default'
    case 'phase': return 'secondary'
    case 'service': return 'outline'
    default: return 'outline'
  }
}

export default function AssessmentsPage() {
  const router = useRouter()
  const [assessments, setAssessments] = useState<AssessmentRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAssessments = useCallback(async () => {
    setLoading(true)

    // Fetch assessments with related data
    const { data, error } = await supabase
      .from('assessments')
      .select(`
        id, name, scope, phase_id, service_id, section_id, type, is_active,
        phase:phases(name),
        service:services(name),
        section:course_sections(name, course:courses(name)),
        assessment_questions(count)
      `)
      .order('name')

    if (error) {
      toast.error('Failed to load assessments')
      setLoading(false)
      return
    }

    // Get attempt counts and avg scores per assessment
    const ids = (data ?? []).map((a: Record<string, unknown>) => a.id as string)
    let attemptMap: Record<string, { count: number; avg_score: number | null }> = {}

    if (ids.length > 0) {
      const { data: attempts } = await supabase
        .from('assessment_attempts')
        .select('assessment_id, score')
        .in('assessment_id', ids)

      if (attempts) {
        const grouped: Record<string, number[]> = {}
        for (const att of attempts) {
          if (!grouped[att.assessment_id]) grouped[att.assessment_id] = []
          grouped[att.assessment_id].push(att.score)
        }
        for (const [aid, scores] of Object.entries(grouped)) {
          attemptMap[aid] = {
            count: scores.length,
            avg_score: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length),
          }
        }
      }
    }

    const rows: AssessmentRow[] = (data ?? []).map((a: Record<string, unknown>) => {
      const scope = a.scope as AssessmentScope
      const phase = a.phase as { name: string } | null
      const service = a.service as { name: string } | null
      const section = a.section as { name: string; course: { name: string } | null } | null
      const type = a.type as string

      let scope_label = 'Entire Journey'
      if (scope === 'phase' && phase) scope_label = phase.name
      if (scope === 'service' && service) scope_label = service.name
      if (scope === 'course_section' && section) {
        const courseName = section.course?.name ?? ''
        scope_label = `${courseName} › ${section.name} (${type})`
      }

      const questions = a.assessment_questions as Array<{ count: number }> | undefined
      const question_count = questions?.[0]?.count ?? 0
      const aid = a.id as string
      const stats = attemptMap[aid]

      return {
        id: aid,
        name: a.name as string,
        scope,
        scope_label,
        question_count,
        attempt_count: stats?.count ?? 0,
        avg_score: stats?.avg_score ?? null,
        is_active: a.is_active as boolean,
        is_standalone: scope !== 'course_section',
      }
    })

    setAssessments(rows)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAssessments()
  }, [fetchAssessments])

  const handleDelete = useCallback(
    async (id: string, name: string) => {
      if (!confirm(`Delete "${name}"? This cannot be undone.`)) return

      const { error } = await supabase
        .from('assessments')
        .delete()
        .eq('id', id)

      if (error) {
        toast.error('Failed to delete assessment')
        return
      }

      toast.success('Assessment deleted')
      fetchAssessments()
    },
    [fetchAssessments]
  )

  return (
    <div>
      <div className="flex justify-end mb-6">
        <Button onClick={() => router.push('/academy/assessments/new')}>
          <Add size={16} />
          Add Assessment
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead className="w-[100px]">Questions</TableHead>
              <TableHead className="w-[100px]">Attempts</TableHead>
              <TableHead className="w-[100px]">Avg Score</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : assessments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No assessments found
                </TableCell>
              </TableRow>
            ) : (
              assessments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant={scopeBadgeVariant(a.scope)}>
                        {a.scope === 'course_section' ? 'Course' : a.scope.charAt(0).toUpperCase() + a.scope.slice(1)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{a.scope_label}</span>
                    </div>
                  </TableCell>
                  <TableCell>{a.question_count}</TableCell>
                  <TableCell>{a.attempt_count}</TableCell>
                  <TableCell>{a.avg_score != null ? `${a.avg_score}%` : '—'}</TableCell>
                  <TableCell>
                    <Badge variant={a.is_active ? 'default' : 'secondary'}>
                      {a.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {a.is_standalone ? (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => router.push(`/academy/assessments/${a.id}/edit`)}
                        >
                          <Edit size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDelete(a.id, a.name)}
                        >
                          <TrashCan size={16} />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Via course</span>
                    )}
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
