'use client'

import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface InviteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onInvitesSent: () => void
}

interface ParsedInvitee {
  email: string
  display_name?: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function parseCSV(text: string): ParsedInvitee[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  const result: ParsedInvitee[] = []
  for (const line of lines) {
    // Skip header line
    if (line.toLowerCase().includes('email') && result.length === 0) continue
    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
    const email = cols[0]
    const display_name = cols[1] || undefined
    if (email && EMAIL_REGEX.test(email)) {
      result.push({ email, display_name })
    }
  }
  return result
}

function downloadTemplate() {
  const csv = 'email,display_name\njohn@example.com,John Smith\njane@example.com,Jane Doe\n'
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'invite-template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export function InviteDialog({ open, onOpenChange, onInvitesSent }: InviteDialogProps) {
  const [mode, setMode] = useState<'single' | 'bulk'>('single')
  const [emailInput, setEmailInput] = useState('')
  const [chips, setChips] = useState<ParsedInvitee[]>([])
  const [message, setMessage] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [csvFileName, setCsvFileName] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function addEmailFromInput(raw: string) {
    const emails = raw.split(/[\s,]+/).map(e => e.trim()).filter(Boolean)
    const toAdd: ParsedInvitee[] = []
    for (const email of emails) {
      if (EMAIL_REGEX.test(email) && !chips.some(c => c.email === email)) {
        toAdd.push({ email })
      }
    }
    if (toAdd.length > 0) setChips(prev => [...prev, ...toAdd])
    setEmailInput('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault()
      addEmailFromInput(emailInput)
    }
    if (e.key === 'Backspace' && !emailInput && chips.length > 0) {
      setChips(prev => prev.slice(0, -1))
    }
  }

  function removeChip(email: string) {
    setChips(prev => prev.filter(c => c.email !== email))
  }

  function handleCSVFile(file: File) {
    setCsvFileName(file.name)
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const parsed = parseCSV(text)
      setChips(prev => {
        const existing = new Set(prev.map(c => c.email))
        const newOnes = parsed.filter(p => !existing.has(p.email))
        return [...prev, ...newOnes]
      })
      if (parsed.length > 0) {
        toast.success(`${parsed.length} email${parsed.length > 1 ? 's' : ''} loaded from CSV`)
      } else {
        toast.error('No valid emails found in CSV')
      }
    }
    reader.readAsText(file)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      handleCSVFile(file)
    } else {
      toast.error('Please drop a CSV file')
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleCSVFile(file)
    e.target.value = ''
  }

  async function handleSend() {
    if (chips.length === 0) {
      toast.error('Add at least one email address')
      return
    }

    setSending(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/team/invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ invitees: chips, message }),
    })

    const result = await res.json()
    setSending(false)

    if (!res.ok) {
      toast.error(result.error ?? 'Failed to send invitations')
      return
    }

    if (result.sent > 0) {
      toast.success(`${result.sent} invitation${result.sent > 1 ? 's' : ''} sent`)
    }
    if (result.errors?.length > 0) {
      for (const err of result.errors) {
        toast.error(`${err.email}: ${err.reason}`)
      }
    }

    if (result.sent > 0) {
      // Reset state
      setChips([])
      setEmailInput('')
      setMessage('')
      setCsvFileName(null)
      onOpenChange(false)
      onInvitesSent()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Invite Team Members</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode tabs */}
          <div className="flex rounded-lg border border-slate-200 p-1">
            {(['single', 'bulk'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors capitalize ${
                  mode === m
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {m === 'single' ? 'Single' : 'Bulk (CSV)'}
              </button>
            ))}
          </div>

          {/* CSV mode */}
          {mode === 'bulk' && (
            <div className="space-y-2">
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 transition-colors ${
                  isDragging
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-slate-300 bg-slate-50 hover:border-slate-400'
                }`}
              >
                <p className="text-sm font-medium text-slate-600">
                  {csvFileName ? csvFileName : 'Drop CSV here or click to browse'}
                </p>
                <p className="mt-1 text-xs text-slate-400">Columns: email, display_name (optional)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleFileInput}
                />
              </div>
              <button
                onClick={downloadTemplate}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Download CSV template
              </button>
            </div>
          )}

          {/* Email chip input */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">
              {mode === 'single' ? 'Email address' : 'Or type emails below'}
            </label>
            <div
              className="flex min-h-[42px] flex-wrap gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500"
              onClick={() => document.getElementById('chip-input')?.focus()}
            >
              {chips.map(chip => (
                <span
                  key={chip.email}
                  className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800"
                >
                  {chip.email}
                  {chip.display_name && <span className="text-blue-500">({chip.display_name})</span>}
                  <button
                    onClick={e => { e.stopPropagation(); removeChip(chip.email) }}
                    className="ml-0.5 text-blue-500 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
              <Input
                id="chip-input"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => { if (emailInput.trim()) addEmailFromInput(emailInput) }}
                placeholder={chips.length === 0 ? 'Type email and press Enter' : ''}
                className="h-auto min-w-[160px] flex-1 border-0 p-0 text-sm shadow-none focus-visible:ring-0"
              />
            </div>
            <p className="text-xs text-slate-400">Press Enter, comma, or space to add each email</p>
          </div>

          {/* Preview */}
          {chips.length > 0 && (
            <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Ready to send <span className="font-semibold text-slate-900">{chips.length}</span>{' '}
              invitation{chips.length > 1 ? 's' : ''}
            </div>
          )}

          {/* Personal message */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">
              Personal message <span className="text-slate-400">(optional)</span>
            </label>
            <textarea
              value={message}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
              placeholder="Add a personal note to your invitation..."
              rows={3}
              className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={sending || chips.length === 0}
              style={{ backgroundColor: '#1175E4' }}
              className="text-white"
            >
              {sending ? 'Sending...' : `Send ${chips.length > 0 ? chips.length : ''} Invite${chips.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
