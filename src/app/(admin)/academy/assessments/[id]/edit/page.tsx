'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { Breadcrumb } from '@/components/breadcrumb'
import { Assessment, AssessmentQuestion, Phase, Service, AssessmentScope, QuestionOption } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { ArrowLeft, Save, Add, Edit, TrashCan } from '@carbon/icons-react'

const SCOPE_OPTIONS: { value: AssessmentScope; label: string }[] = [
  { value: 'journey', label: 'Entire Journey' },
  { value: 'phase', label: 'Phase' },
  { value: 'service', label: 'Service' },
]

const defaultOptions: QuestionOption[] = [
  { label: 'A', value: '', is_correct: true },
  { label: 'B', value: '', is_correct: false },
  { label: 'C', value: '', is_correct: false },
  { label: 'D', value: '', is_correct: false },
]

interface QuestionForm {
  question_text: string
  options: QuestionOption[]
  points: string
  weight: string
  phase_id: string
  sort_order: string
}

const emptyQuestionForm: QuestionForm = {
  question_text: '',
  options: defaultOptions,
  points: '1',
  weight: '1',
  phase_id: '',
  sort_order: '',
}

export default function EditAssessmentPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  // Assessment metadata
  const [phases, setPhases] = useState<Phase[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [formScope, setFormScope] = useState<AssessmentScope>('journey')
  const [formPhaseId, setFormPhaseId] = useState<string>('')
  const [formServiceId, setFormServiceId] = useState<string>('')
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formPassThreshold, setFormPassThreshold] = useState('80')
  const [formActive, setFormActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  // Questions
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([])
  const [showAddQuestion, setShowAddQuestion] = useState(false)
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)
  const [questionForm, setQuestionForm] = useState<QuestionForm>(emptyQuestionForm)
  const [savingQuestion, setSavingQuestion] = useState(false)

  const fetchOptions = useCallback(async () => {
    const [pRes, sRes] = await Promise.all([
      supabase.from('phases').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('services').select('*, phase:phases(name)').eq('is_active', true).order('name'),
    ])
    if (pRes.data) setPhases(pRes.data as Phase[])
    if (sRes.data) setServices(sRes.data as Service[])
  }, [])

  const fetchQuestions = useCallback(async () => {
    const { data, error } = await supabase
      .from('assessment_questions')
      .select('*')
      .eq('assessment_id', id)
      .order('sort_order')

    if (error) {
      toast.error('Failed to load questions')
      return
    }
    setQuestions((data as AssessmentQuestion[]) ?? [])
  }, [id])

  useEffect(() => {
    async function fetchAssessment() {
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) {
        toast.error('Failed to load assessment')
        router.push('/academy/assessments')
        return
      }

      const a = data as Assessment
      setFormScope(a.scope)
      setFormPhaseId(a.phase_id ?? '')
      setFormServiceId(a.service_id ?? '')
      setFormName(a.name)
      setFormDescription(a.description ?? '')
      setFormPassThreshold(String(a.pass_threshold))
      setFormActive(a.is_active)
      setLoading(false)
    }

    fetchAssessment()
    fetchOptions()
    fetchQuestions()
  }, [id, router, fetchOptions, fetchQuestions])

  async function handleSave() {
    if (!formName.trim()) {
      toast.error('Assessment name is required')
      return
    }
    if (formScope === 'phase' && !formPhaseId) {
      toast.error('Please select a phase')
      return
    }
    if (formScope === 'service' && !formServiceId) {
      toast.error('Please select a service')
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from('assessments')
      .update({
        name: formName.trim(),
        description: formDescription.trim() || null,
        pass_threshold: Number(formPassThreshold) || 80,
        is_active: formActive,
        scope: formScope,
        phase_id: formScope === 'phase' ? formPhaseId : null,
        service_id: formScope === 'service' ? formServiceId : null,
      })
      .eq('id', id)

    if (error) {
      toast.error('Failed to update assessment')
      setSaving(false)
      return
    }

    toast.success('Assessment updated')
    setSaving(false)
  }

  // Question form helpers
  function startAddQuestion() {
    setEditingQuestionId(null)
    setQuestionForm({ ...emptyQuestionForm, sort_order: String(questions.length + 1) })
    setShowAddQuestion(true)
  }

  function startEditQuestion(q: AssessmentQuestion) {
    setShowAddQuestion(false)
    setEditingQuestionId(q.id)
    setQuestionForm({
      question_text: q.question_text,
      options: q.options.length === 4 ? q.options : defaultOptions,
      points: String(q.points),
      weight: String(q.weight),
      phase_id: q.phase_id ?? '',
      sort_order: String(q.sort_order),
    })
  }

  function cancelQuestionForm() {
    setShowAddQuestion(false)
    setEditingQuestionId(null)
    setQuestionForm(emptyQuestionForm)
  }

  function setOptionValue(index: number, value: string) {
    const opts = [...questionForm.options]
    opts[index] = { ...opts[index], value }
    setQuestionForm({ ...questionForm, options: opts })
  }

  function setCorrectOption(index: number) {
    const opts = questionForm.options.map((opt, i) => ({ ...opt, is_correct: i === index }))
    setQuestionForm({ ...questionForm, options: opts })
  }

  async function saveQuestion() {
    const trimmedText = questionForm.question_text.trim()
    if (!trimmedText) {
      toast.error('Question text is required')
      return
    }
    if (questionForm.options.some((o) => !o.value.trim())) {
      toast.error('All options must have text')
      return
    }

    setSavingQuestion(true)

    const payload = {
      assessment_id: id,
      question_text: trimmedText,
      options: questionForm.options.map((o) => ({ ...o, value: o.value.trim() })),
      points: Number(questionForm.points) || 1,
      weight: Number(questionForm.weight) || 1,
      phase_id: questionForm.phase_id || null,
      sort_order: Number(questionForm.sort_order) || 0,
    }

    if (editingQuestionId) {
      const { error } = await supabase.from('assessment_questions').update(payload).eq('id', editingQuestionId)
      if (error) { toast.error('Failed to update question'); setSavingQuestion(false); return }
      toast.success('Question updated')
    } else {
      const { error } = await supabase.from('assessment_questions').insert(payload)
      if (error) { toast.error('Failed to create question'); setSavingQuestion(false); return }
      toast.success('Question created')
    }

    setSavingQuestion(false)
    cancelQuestionForm()
    fetchQuestions()
  }

  async function deleteQuestion(qId: string) {
    if (!confirm('Delete this question?')) return
    const { error } = await supabase.from('assessment_questions').delete().eq('id', qId)
    if (error) { toast.error('Failed to delete question'); return }
    toast.success('Question deleted')
    fetchQuestions()
  }

  function renderQuestionForm() {
    return (
      <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
        <div className="grid gap-2">
          <Label>Question Text *</Label>
          <textarea
            value={questionForm.question_text}
            onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })}
            placeholder="Enter question text"
            rows={3}
            className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          />
        </div>
        <div className="space-y-2">
          <Label>Options (select correct answer)</Label>
          {questionForm.options.map((opt, i) => (
            <div key={opt.label} className="flex items-center gap-2">
              <input
                type="radio"
                name="correct-option"
                checked={opt.is_correct}
                onChange={() => setCorrectOption(i)}
                className="h-4 w-4"
              />
              <span className="text-sm font-medium w-6">{opt.label}.</span>
              <Input
                value={opt.value}
                onChange={(e) => setOptionValue(i, e.target.value)}
                placeholder={`Option ${opt.label}`}
                className="flex-1"
              />
            </div>
          ))}
        </div>
        <div className="flex gap-4">
          <div className="grid gap-2">
            <Label>Phase Tag</Label>
            <Select
              value={questionForm.phase_id || 'none'}
              onValueChange={(v) => setQuestionForm({ ...questionForm, phase_id: v === 'none' ? '' : v ?? '' })}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No phase</SelectItem>
                {phases.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Weight</Label>
            <Input
              type="number"
              value={questionForm.weight}
              onChange={(e) => setQuestionForm({ ...questionForm, weight: e.target.value })}
              className="w-24"
              min={1}
            />
          </div>
          <div className="grid gap-2">
            <Label>Points</Label>
            <Input
              type="number"
              value={questionForm.points}
              onChange={(e) => setQuestionForm({ ...questionForm, points: e.target.value })}
              className="w-24"
              min={1}
            />
          </div>
          <div className="grid gap-2">
            <Label>Sort Order</Label>
            <Input
              type="number"
              value={questionForm.sort_order}
              onChange={(e) => setQuestionForm({ ...questionForm, sort_order: e.target.value })}
              className="w-24"
            />
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <Button onClick={saveQuestion} disabled={savingQuestion} size="sm">
            {savingQuestion ? 'Saving...' : 'Save'}
          </Button>
          <Button onClick={cancelQuestionForm} variant="outline" size="sm">
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div>
        <Breadcrumb />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div>
      <Breadcrumb />
      <div className="mb-6">
        <button
          onClick={() => router.push('/academy/assessments')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} /> Back to Assessments
        </button>
      </div>
      <h1 className="text-2xl font-bold mb-6">Edit Assessment</h1>

      {/* Assessment metadata */}
      <div className="grid gap-4 max-w-lg mb-8">
        <div className="grid gap-2">
          <Label>Scope</Label>
          <Select value={formScope} onValueChange={(v) => setFormScope(v as AssessmentScope)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCOPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {formScope === 'phase' && (
          <div className="grid gap-2">
            <Label>Phase</Label>
            <Select value={formPhaseId} onValueChange={(v) => setFormPhaseId(v ?? '')}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select phase" />
              </SelectTrigger>
              <SelectContent>
                {phases.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {formScope === 'service' && (
          <div className="grid gap-2">
            <Label>Service</Label>
            <Select value={formServiceId} onValueChange={(v) => setFormServiceId(v ?? '')}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select service" />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}{s.phase ? ` (${s.phase.name})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid gap-2">
          <Label htmlFor="assessment-name">Name</Label>
          <Input
            id="assessment-name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Assessment name"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="assessment-description">Description</Label>
          <textarea
            id="assessment-description"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            placeholder="Assessment description"
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="assessment-threshold">Pass Threshold (%)</Label>
          <Input
            id="assessment-threshold"
            type="number"
            value={formPassThreshold}
            onChange={(e) => setFormPassThreshold(e.target.value)}
            min={0}
            max={100}
            className="w-28"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="assessment-active"
            checked={formActive}
            onChange={(e) => setFormActive(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          <Label htmlFor="assessment-active">Active</Label>
        </div>

        <div>
          <Button onClick={handleSave} disabled={saving}>
            <Save size={16} className="mr-2" />
            {saving ? 'Saving...' : 'Save Assessment'}
          </Button>
        </div>
      </div>

      {/* Questions section */}
      <div className="max-w-2xl">
        <h2 className="text-lg font-semibold mb-4">Questions</h2>

        <div className="space-y-3">
          {questions.map((q) => (
            <div key={q.id}>
              {editingQuestionId === q.id ? (
                renderQuestionForm()
              ) : (
                <div className="rounded-lg border px-4 py-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1.5 flex-1">
                      <p className="text-sm font-medium">{q.question_text}</p>
                      <div className="grid grid-cols-2 gap-1">
                        {q.options.map((opt) => (
                          <span
                            key={opt.label}
                            className={`text-xs px-2 py-1 rounded ${
                              opt.is_correct
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 font-medium'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {opt.label}. {opt.value}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Phase: {phases.find((p) => p.id === q.phase_id)?.name ?? 'None'}
                        {' | '}Weight: {q.weight}
                        {' | '}Points: {q.points}
                        {' | '}Order: {q.sort_order}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button variant="ghost" size="sm" onClick={() => startEditQuestion(q)}>
                        <Edit size={16} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteQuestion(q.id)}>
                        <TrashCan size={16} />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {showAddQuestion && renderQuestionForm()}

          {!showAddQuestion && !editingQuestionId && (
            <Button variant="outline" size="sm" onClick={startAddQuestion}>
              <Add size={16} />
              Add Question
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
