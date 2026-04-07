'use client'

import { useRef, useState } from 'react'
import { SendFilled } from '@carbon/icons-react'
import { Button } from '@/components/ui/button'

interface MessageInputProps {
  onSend: (message: string) => void
  disabled: boolean
  placeholder?: string
}

export function MessageInput({
  onSend,
  disabled,
  placeholder = 'Type a message…',
}: MessageInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function autoResize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value)
    autoResize()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  function submit() {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    // Reset height after clearing
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    })
  }

  return (
    <div className="border-t p-4 flex gap-2 items-end">
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 overflow-hidden leading-relaxed"
        style={{ minHeight: '40px', maxHeight: '200px' }}
      />

      <Button
        size="icon"
        onClick={submit}
        disabled={disabled || !value.trim()}
        title="Send message"
        className="shrink-0"
      >
        <SendFilled size={16} />
      </Button>
    </div>
  )
}
