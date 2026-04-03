'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import { Assessment, AssessmentQuestion, QuestionOption } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Add, Edit, TrashCan } from '@carbon/icons-react'

interface AssessmentEditorProps {
  sectionId: string
  type: 'pre' | 'post'
}

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
  sort_order: string
}

const emptyQuestionForm: QuestionForm = {
  question_text: '',
  options: defaultOptions,
  points: '1',
  sort_order: '',
}

export function AssessmentEditor({ sectionId, type }: AssessmentEditorProps) {
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Assessment metadata form
  const [assessmentName, setAssessmentName] = useState('')
  const [assessmentDescription, setAssessmentDescription] = useState('')
  const [passThreshold, setPassThreshold] = useState('80')

  // Questions
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([])
  const [showAddQuestion, setShowAddQuestion] = useState(false)
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)
  const [questionForm, setQuestionForm] = useState<QuestionForm>(emptyQuestionForm)
  const [savingQuestion, setSavingQuestion] = useState(false)

  const label = type === 'pre' ? 'Pre-Assessment' : 'Post-Assessment'

  const fetchAssessment = useCallback(async () => {
    const { data, error } = await supabase
      .from('assessments')
      .select('*')
      .eq('section_id', sectionId)
      .eq('type', type)
      .maybeSingle()

    if (error) {
      toast.error(`Failed to load ${label.toLowerCase()}`)
      setLoading(false)
      return
    }

    if (data) {
      const a = data as Assessment
      setAssessment(a)
      setAssessmentName(a.name)
      setAssessmentDescription(a.description ?? '')
      setPassThreshold(String(a.pass_threshold))
    }

    setLoading(false)
  }, [sectionId, type, label])

  const fetchQuestions = useCallback(async () => {
    if (!assessment) return

    const { data, error } = await supabase
      .from('assessment_questions')
      .select('*')
      .eq('assessment_id', assessment.id)
      .order('sort_order')

    if (error) {
      toast.error('Failed to load questions')
      return
    }

    setQuestions((data as AssessmentQuestion[]) ?? [])
  }, [assessment])

  useEffect(() => {
    fetchAssessment()
  }, [fetchAssessment])

  useEffect(() => {
    if (assessment) {
      fetchQuestions()
    }
  }, [assessment, fetchQuestions])

  async function createAssessment() {
    setSaving(true)

    const payload = {
      section_id: sectionId,
      type,
      name: label,
      description: null,
      pass_threshold: 80,
    }

    const { data, error } = await supabase
      .from('assessments')
      .insert(payload)
      .select()
      .single()

    if (error) {
      toast.error(`Failed to create ${label.toLowerCase()}`)
      setSaving(false)
      return
    }

    const a = data as Assessment
    setAssessment(a)
    setAssessmentName(a.name)
    setAssessmentDescription(a.description ?? '')
    setPassThreshold(String(a.pass_threshold))
    toast.success(`${label} created`)
    setSaving(false)
  }

  async function saveAssessmentMeta() {
    if (!assessment) return

    const trimmedName = assessmentName.trim()
    if (!trimmedName) {
      toast.error('Assessment name is required')
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from('assessments')
      .update({
        name: trimmedName,
        description: assessmentDescription.trim() || null,
        pass_threshold: Number(passThreshold) || 80,
      })
      .eq('id', assessment.id)

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
    setQuestionForm({
      ...emptyQuestionForm,
      sort_order: String(questions.length + 1),
    })
    setShowAddQuestion(true)
  }

  function startEditQuestion(q: AssessmentQuestion) {
    setShowAddQuestion(false)
    setEditingQuestionId(q.id)
    setQuestionForm({
      question_text: q.question_text,
      options: q.options.length === 4 ? q.options : defaultOptions,
      points: String(q.points),
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
    const opts = questionForm.options.map((opt, i) => ({
      ...opt,
      is_correct: i === index,
    }))
    setQuestionForm({ ...questionForm, options: opts })
  }

  async function saveQuestion() {
    if (!assessment) return

    const trimmedText = questionForm.question_text.trim()
    if (!trimmedText) {
      toast.error('Question text is required')
      return
    }

    const hasEmptyOption = questionForm.options.some((o) => !o.value.trim())
    if (hasEmptyOption) {
      toast.error('All options must have text')
      return
    }

    setSavingQuestion(true)

    const payload = {
      assessment_id: assessment.id,
      question_text: trimmedText,
      options: questionForm.options.map((o) => ({
        ...o,
        value: o.value.trim(),
      })),
      points: Number(questionForm.points) || 1,
      sort_order: Number(questionForm.sort_order) || 0,
    }

    if (editingQuestionId) {
      const { error } = await supabase
        .from('assessment_questions')
        .update(payload)
        .eq('id', editingQuestionId)

      if (error) {
        toast.error('Failed to update question')
        setSavingQuestion(false)
        return
      }
      toast.success('Question updated')
    } else {
      const { error } = await supabase
        .from('assessment_questions')
        .insert(payload)

      if (error) {
        toast.error('Failed to create question')
        setSavingQuestion(false)
        return
      }
      toast.success('Question created')
    }

    setSavingQuestion(false)
    cancelQuestionForm()
    fetchQuestions()
  }

  async function deleteQuestion(id: string) {
    if (!confirm('Delete this question?')) return

    const { error } = await supabase
      .from('assessment_questions')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Failed to delete question')
      return
    }

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
            onChange={(e) =>
              setQuestionForm({ ...questionForm, question_text: e.target.value })
            }
            placeholder="Enter question text"
            rows={3}
            className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
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
            <Label>Points</Label>
            <Input
              type="number"
              value={questionForm.points}
              onChange={(e) =>
                setQuestionForm({ ...questionForm, points: e.target.value })
              }
              className="w-24"
              min={1}
            />
          </div>
          <div className="grid gap-2">
            <Label>Sort Order</Label>
            <Input
              type="number"
              value={questionForm.sort_order}
              onChange={(e) =>
                setQuestionForm({ ...questionForm, sort_order: e.target.value })
              }
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
    return <p className="text-sm text-muted-foreground">Loading {label.toLowerCase()}...</p>
  }

  if (!assessment) {
    return (
      <Button onClick={createAssessment} disabled={saving} variant="outline" size="sm">
        <Add size={16} />
        {saving ? 'Creating...' : `Create ${label}`}
      </Button>
    )
  }

  return (
    <div className="space-y-4">
      {/* Assessment metadata */}
      <div className="space-y-3 rounded-lg border p-4">
        <div className="grid gap-2">
          <Label>Name</Label>
          <Input
            value={assessmentName}
            onChange={(e) => setAssessmentName(e.target.value)}
            placeholder="Assessment name"
          />
        </div>
        <div className="grid gap-2">
          <Label>Description</Label>
          <textarea
            value={assessmentDescription}
            onChange={(e) => setAssessmentDescription(e.target.value)}
            placeholder="Assessment description"
            rows={2}
            className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
          />
        </div>
        <div className="grid gap-2">
          <Label>Pass Threshold (%)</Label>
          <Input
            type="number"
            value={passThreshold}
            onChange={(e) => setPassThreshold(e.target.value)}
            min={0}
            max={100}
            className="w-28"
          />
        </div>
        <Button onClick={saveAssessmentMeta} disabled={saving} size="sm">
          {saving ? 'Saving...' : 'Save Assessment'}
        </Button>
      </div>

      {/* Questions */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold">Questions</h4>

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
                      Points: {q.points} | Order: {q.sort_order}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEditQuestion(q)}
                    >
                      <Edit size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteQuestion(q.id)}
                    >
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
  )
}
