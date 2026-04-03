'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import {
  ServiceRunbookStep,
  Product,
  Skill,
  ServiceProduct,
  ServiceSkill,
} from '@/lib/types'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Add, TrashCan, Save } from '@carbon/icons-react'

interface RunbookTabProps {
  serviceId: string
}

interface StepFormData {
  title: string
  description: string
  estimated_minutes: number | ''
  product_id: string
  skill_id: string
  role: string
  sort_order: number
}

function stepToForm(step: ServiceRunbookStep): StepFormData {
  return {
    title: step.title,
    description: step.description ?? '',
    estimated_minutes: step.estimated_minutes ?? '',
    product_id: step.product_id ?? '',
    skill_id: step.skill_id ?? '',
    role: step.role ?? '',
    sort_order: step.sort_order,
  }
}

export function RunbookTab({ serviceId }: RunbookTabProps) {
  const [steps, setSteps] = useState<ServiceRunbookStep[]>([])
  const [forms, setForms] = useState<Record<string, StepFormData>>({})
  const [products, setProducts] = useState<Product[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const [stepsResult, productsResult, skillsResult] = await Promise.all([
      supabase
        .from('service_runbook_steps')
        .select('*')
        .eq('service_id', serviceId)
        .order('sort_order'),
      supabase
        .from('service_products')
        .select('*, product:products(*)')
        .eq('service_id', serviceId),
      supabase
        .from('service_skills')
        .select('*, skill:skills(*)')
        .eq('service_id', serviceId),
    ])

    if (stepsResult.error) {
      toast.error('Failed to load runbook steps')
      setLoading(false)
      return
    }

    const stepsData = (stepsResult.data as ServiceRunbookStep[]) ?? []
    setSteps(stepsData)

    const formMap: Record<string, StepFormData> = {}
    for (const step of stepsData) {
      formMap[step.id] = stepToForm(step)
    }
    setForms(formMap)

    const linkedProducts = (productsResult.data as ServiceProduct[]) ?? []
    setProducts(
      linkedProducts
        .map((sp) => sp.product)
        .filter((p): p is Product => !!p)
    )

    const linkedSkills = (skillsResult.data as ServiceSkill[]) ?? []
    setSkills(
      linkedSkills
        .map((ss) => ss.skill)
        .filter((s): s is Skill => !!s)
    )

    setLoading(false)
  }, [serviceId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function updateForm(stepId: string, field: keyof StepFormData, value: string | number) {
    setForms((prev) => ({
      ...prev,
      [stepId]: { ...prev[stepId], [field]: value },
    }))
  }

  async function handleAdd() {
    const nextOrder =
      steps.length > 0
        ? Math.max(...steps.map((s) => s.sort_order)) + 1
        : 1

    const { data, error } = await supabase
      .from('service_runbook_steps')
      .insert({
        service_id: serviceId,
        title: 'New Step',
        sort_order: nextOrder,
      })
      .select('*')
      .single()

    if (error) {
      toast.error('Failed to add step')
      return
    }

    const newStep = data as ServiceRunbookStep
    setSteps((prev) => [...prev, newStep])
    setForms((prev) => ({
      ...prev,
      [newStep.id]: stepToForm(newStep),
    }))
    toast.success('Step added')
  }

  async function handleSave(stepId: string) {
    const form = forms[stepId]
    if (!form) return

    if (!form.title.trim()) {
      toast.error('Title is required')
      return
    }

    const { error } = await supabase
      .from('service_runbook_steps')
      .update({
        title: form.title.trim(),
        description: form.description.trim() || null,
        estimated_minutes:
          form.estimated_minutes === '' ? null : Number(form.estimated_minutes),
        product_id: form.product_id || null,
        skill_id: form.skill_id || null,
        role: form.role.trim() || null,
        sort_order: Number(form.sort_order),
      })
      .eq('id', stepId)

    if (error) {
      toast.error('Failed to save step')
      return
    }

    setSteps((prev) =>
      prev.map((s) =>
        s.id === stepId
          ? {
              ...s,
              title: form.title.trim(),
              description: form.description.trim() || null,
              estimated_minutes:
                form.estimated_minutes === ''
                  ? null
                  : Number(form.estimated_minutes),
              product_id: form.product_id || null,
              skill_id: form.skill_id || null,
              role: form.role.trim() || null,
              sort_order: Number(form.sort_order),
            }
          : s
      )
    )
    toast.success('Step saved')
  }

  async function handleDelete(stepId: string) {
    if (!confirm('Delete this step?')) return

    const { error } = await supabase
      .from('service_runbook_steps')
      .delete()
      .eq('id', stepId)

    if (error) {
      toast.error('Failed to delete step')
      return
    }

    setSteps((prev) => prev.filter((s) => s.id !== stepId))
    setForms((prev) => {
      const next = { ...prev }
      delete next[stepId]
      return next
    })
    toast.success('Step deleted')
  }

  if (loading) return null

  const inputClass =
    'flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30'

  const selectClass =
    'flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30'

  return (
    <div className="max-w-4xl space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Runbook Steps</h2>
        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Add size={16} />
          Add Step
        </button>
      </div>

      {steps.length === 0 && (
        <p className="text-sm text-muted-foreground py-4">
          No runbook steps yet. Click &quot;Add Step&quot; to get started.
        </p>
      )}

      {steps.map((step) => {
        const form = forms[step.id]
        if (!form) return null

        return (
          <div
            key={step.id}
            className="rounded-lg border p-4 space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Title *</Label>
                <input
                  type="text"
                  className={inputClass}
                  value={form.title}
                  onChange={(e) => updateForm(step.id, 'title', e.target.value)}
                  placeholder="Step title"
                />
              </div>

              <div className="grid gap-1.5">
                <Label>Role</Label>
                <input
                  type="text"
                  className={inputClass}
                  value={form.role}
                  onChange={(e) => updateForm(step.id, 'role', e.target.value)}
                  placeholder="e.g. Engineer, Project Manager"
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>Description</Label>
              <textarea
                className={`${inputClass} h-20 resize-y`}
                value={form.description}
                onChange={(e) =>
                  updateForm(step.id, 'description', e.target.value)
                }
                placeholder="Step description..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="grid gap-1.5">
                <Label>Est. Minutes</Label>
                <input
                  type="number"
                  className={inputClass}
                  value={form.estimated_minutes}
                  onChange={(e) =>
                    updateForm(
                      step.id,
                      'estimated_minutes',
                      e.target.value === '' ? '' : Number(e.target.value)
                    )
                  }
                  min={0}
                  placeholder="0"
                />
              </div>

              <div className="grid gap-1.5">
                <Label>Product</Label>
                <select
                  className={selectClass}
                  value={form.product_id}
                  onChange={(e) =>
                    updateForm(step.id, 'product_id', e.target.value)
                  }
                >
                  <option value="">None</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-1.5">
                <Label>Skill</Label>
                <select
                  className={selectClass}
                  value={form.skill_id}
                  onChange={(e) =>
                    updateForm(step.id, 'skill_id', e.target.value)
                  }
                >
                  <option value="">None</option>
                  {skills.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-1.5">
                <Label>Sort Order</Label>
                <input
                  type="number"
                  className={inputClass}
                  value={form.sort_order}
                  onChange={(e) =>
                    updateForm(step.id, 'sort_order', Number(e.target.value))
                  }
                  min={0}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleSave(step.id)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <Save size={16} />
                Save
              </button>
              <button
                type="button"
                onClick={() => handleDelete(step.id)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <TrashCan size={16} />
                Delete
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
