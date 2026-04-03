'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import { Skill, ServiceSkill } from '@/lib/types'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { TrashCan } from '@carbon/icons-react'

interface SkillsTabProps {
  serviceId: string
}

export function SkillsTab({ serviceId }: SkillsTabProps) {
  const [allSkills, setAllSkills] = useState<Skill[]>([])
  const [linked, setLinked] = useState<ServiceSkill[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const [skillsResult, linkedResult] = await Promise.all([
      supabase
        .from('skills')
        .select('*')
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('service_skills')
        .select('*, skill:skills(*)')
        .eq('service_id', serviceId),
    ])

    if (skillsResult.error) {
      toast.error('Failed to load skills')
      setLoading(false)
      return
    }

    if (linkedResult.error) {
      toast.error('Failed to load linked skills')
      setLoading(false)
      return
    }

    setAllSkills((skillsResult.data as Skill[]) ?? [])
    setLinked((linkedResult.data as ServiceSkill[]) ?? [])
    setLoading(false)
  }, [serviceId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const linkedIds = new Set(linked.map((l) => l.skill_id))
  const availableSkills = allSkills.filter((s) => !linkedIds.has(s.id))

  async function handleAdd(skillId: string) {
    if (!skillId) return

    const { error } = await supabase
      .from('service_skills')
      .insert({ service_id: serviceId, skill_id: skillId })

    if (error) {
      toast.error('Failed to add skill')
      return
    }

    const skill = allSkills.find((s) => s.id === skillId)
    if (skill) {
      setLinked((prev) => [
        ...prev,
        { service_id: serviceId, skill_id: skillId, notes: null, skill },
      ])
    }
  }

  async function handleRemove(skillId: string) {
    const { error } = await supabase
      .from('service_skills')
      .delete()
      .eq('service_id', serviceId)
      .eq('skill_id', skillId)

    if (error) {
      toast.error('Failed to remove skill')
      return
    }

    setLinked((prev) => prev.filter((l) => l.skill_id !== skillId))
  }

  async function handleNotesBlur(skillId: string, notes: string) {
    const { error } = await supabase
      .from('service_skills')
      .update({ notes })
      .eq('service_id', serviceId)
      .eq('skill_id', skillId)

    if (error) {
      toast.error('Failed to update notes')
    }
  }

  function handleNotesChange(skillId: string, notes: string) {
    setLinked((prev) =>
      prev.map((l) =>
        l.skill_id === skillId ? { ...l, notes } : l
      )
    )
  }

  if (loading) return null

  return (
    <div className="max-w-4xl space-y-4 pt-4">
      <div className="grid gap-2 max-w-md">
        <Label>Add Skill</Label>
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
              Select a skill...
            </option>
            {availableSkills.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
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
                <th className="px-4 py-2 text-left font-medium">Category</th>
                <th className="px-4 py-2 text-left font-medium">Notes</th>
                <th className="px-4 py-2 text-right font-medium w-16"></th>
              </tr>
            </thead>
            <tbody>
              {linked.map((ss) => (
                <tr key={ss.skill_id} className="border-b last:border-0">
                  <td className="px-4 py-2">{ss.skill?.name ?? '—'}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {ss.skill?.category ?? '—'}
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none dark:bg-input/30"
                      value={ss.notes ?? ''}
                      onChange={(e) =>
                        handleNotesChange(ss.skill_id, e.target.value)
                      }
                      onBlur={(e) =>
                        handleNotesBlur(ss.skill_id, e.target.value)
                      }
                      placeholder="Add notes..."
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemove(ss.skill_id)}
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
          No skills linked yet. Use the dropdown above to add skills.
        </p>
      )}
    </div>
  )
}
