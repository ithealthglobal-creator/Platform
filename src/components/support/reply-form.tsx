'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface ReplyFormProps {
  onSubmit: (body: string, isInternal: boolean, sendEmail: boolean) => Promise<void>
  isAdmin?: boolean
}

export function ReplyForm({ onSubmit, isAdmin }: ReplyFormProps) {
  const [body, setBody] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [sendEmail, setSendEmail] = useState(true)
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!body.trim()) return
    setSaving(true)
    await onSubmit(body, isInternal, sendEmail)
    setBody('')
    setIsInternal(false)
    setSaving(false)
  }

  return (
    <div className="rounded-lg border bg-white p-4">
      {isAdmin && (
        <div className="mb-3 flex gap-2">
          <Button
            size="sm"
            variant={!isInternal ? 'default' : 'outline'}
            onClick={() => setIsInternal(false)}
          >
            Reply
          </Button>
          <Button
            size="sm"
            variant={isInternal ? 'default' : 'outline'}
            className={isInternal ? 'bg-amber-500 hover:bg-amber-600' : ''}
            onClick={() => setIsInternal(true)}
          >
            Internal Note
          </Button>
        </div>
      )}

      <textarea
        className="w-full rounded-md border border-slate-200 bg-slate-50 p-3 text-sm focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
        rows={4}
        placeholder={isInternal ? 'Write an internal note...' : 'Write your reply...'}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />

      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs text-slate-400">
          <Button variant="ghost" size="sm" disabled className="text-xs text-slate-400">
            📎 Attach file (Coming soon)
          </Button>
        </div>
        <div className="flex items-center gap-3">
          {!isInternal && (
            <Label className="flex items-center gap-2 text-xs text-slate-500">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="rounded"
              />
              Send email notification
            </Label>
          )}
          <Button onClick={handleSubmit} disabled={saving || !body.trim()} size="sm">
            {saving ? 'Sending...' : isInternal ? 'Add Note' : 'Send Reply'}
          </Button>
        </div>
      </div>
    </div>
  )
}
