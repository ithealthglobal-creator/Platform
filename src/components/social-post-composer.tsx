'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { Bullhorn, Renew, Save, LogoLinkedin, LogoX, LogoFacebook, LogoInstagram } from '@carbon/icons-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { BlogPost, SocialPlatform } from '@/lib/types'

const SOCIAL_POST_COMPOSER_AGENT_ID = 'a0000000-0000-0000-0000-000000000008'

const PLATFORMS: { key: SocialPlatform; label: string; delimiter: string }[] = [
  { key: 'linkedin', label: 'LinkedIn', delimiter: '=== LINKEDIN ===' },
  { key: 'x', label: 'X', delimiter: '=== X ===' },
  { key: 'facebook', label: 'Facebook', delimiter: '=== FACEBOOK ===' },
  { key: 'instagram', label: 'Instagram', delimiter: '=== INSTAGRAM ===' },
]

type Drafts = Record<SocialPlatform, string>

const emptyDrafts: Drafts = { linkedin: '', x: '', facebook: '', instagram: '' }

// Split a (possibly partial) raw response into one section per platform.
// Any text that hasn't yet hit the next delimiter accumulates into the
// currently-open section so the user sees tokens land live.
function parseSections(raw: string): Drafts {
  const out: Drafts = { ...emptyDrafts }
  let cursor: SocialPlatform | null = null
  let buf = ''

  const lines = raw.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    const match = PLATFORMS.find((p) => p.delimiter === trimmed)
    if (match) {
      if (cursor) out[cursor] = buf.trim()
      cursor = match.key
      buf = ''
      continue
    }
    if (cursor) buf += line + '\n'
  }
  if (cursor) out[cursor] = buf.trim()
  return out
}

function stripHtml(html: string | null): string {
  if (!html) return ''
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function extractTokenText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((c) => {
        if (typeof c === 'string') return c
        if (c && typeof c === 'object' && 'text' in c) {
          const t = (c as { text?: unknown }).text
          return typeof t === 'string' ? t : ''
        }
        return ''
      })
      .join('')
  }
  return ''
}

interface Props {
  blogPost: BlogPost | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}

export function SocialPostComposer({ blogPost, open, onOpenChange, onSaved }: Props) {
  const [drafts, setDrafts] = useState<Drafts>(emptyDrafts)
  const [streaming, setStreaming] = useState(false)
  const [activeTab, setActiveTab] = useState<SocialPlatform>('linkedin')
  const [savingPlatform, setSavingPlatform] = useState<SocialPlatform | null>(null)
  const [hasGenerated, setHasGenerated] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  // Reset state whenever the sheet is opened for a (possibly different) post.
  useEffect(() => {
    if (!open) {
      abortRef.current?.abort()
      abortRef.current = null
      return
    }
    setDrafts(emptyDrafts)
    setHasGenerated(false)
    setStreaming(false)
    setActiveTab('linkedin')
  }, [open, blogPost?.id])

  const generate = useCallback(async () => {
    if (!blogPost) return

    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token
    if (!token) {
      toast.error('Not authenticated')
      return
    }

    const articleText = [
      `Title: ${blogPost.title}`,
      blogPost.category ? `Category: ${blogPost.category}` : null,
      blogPost.excerpt ? `Excerpt: ${blogPost.excerpt}` : null,
      '',
      'Body:',
      stripHtml(blogPost.content) || '(empty)',
    ]
      .filter(Boolean)
      .join('\n')

    setDrafts(emptyDrafts)
    setStreaming(true)
    setHasGenerated(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const response = await fetch('/api/admin/ai/chat', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversation_id: null,
          message: articleText,
          agent_id: SOCIAL_POST_COMPOSER_AGENT_ID,
        }),
      })

      if (!response.ok) {
        const errText = await response.text()
        toast.error(`Composer error: ${errText}`)
        setStreaming(false)
        return
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let raw = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const records = buffer.split('\n\n')
        buffer = records.pop() ?? ''

        for (const record of records) {
          let eventName = ''
          let dataPayload = ''
          for (const line of record.split('\n')) {
            if (line.startsWith('event: ')) eventName = line.slice(7).trim()
            else if (line.startsWith('data: ')) dataPayload += line.slice(6)
          }
          if (!dataPayload || dataPayload === '[DONE]') continue

          let data: Record<string, unknown>
          try {
            data = JSON.parse(dataPayload) as Record<string, unknown>
          } catch {
            continue
          }
          if (!eventName) eventName = (data.type as string) ?? ''

          if (eventName === 'token') {
            const text = extractTokenText(data.content) || (data.token as string) || ''
            if (text) {
              raw += text
              setDrafts(parseSections(raw))
            }
          } else if (eventName === 'error') {
            toast.error((data.message as string) || 'Composer error')
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        toast.error('Connection error — please try again')
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }, [blogPost])

  // Auto-run on open if we haven't generated yet for this post.
  useEffect(() => {
    if (open && blogPost && !hasGenerated && !streaming) {
      generate()
    }
  }, [open, blogPost, hasGenerated, streaming, generate])

  async function savePlatform(platform: SocialPlatform) {
    if (!blogPost) return
    const content = drafts[platform].trim()
    if (!content) {
      toast.error('Draft is empty')
      return
    }

    setSavingPlatform(platform)
    const { data: sessionData } = await supabase.auth.getSession()
    const userId = sessionData?.session?.user?.id ?? null

    const { error } = await supabase.from('social_posts').insert({
      blog_post_id: blogPost.id,
      platform,
      content,
      status: 'draft',
      created_by: userId,
    })

    setSavingPlatform(null)

    if (error) {
      toast.error('Failed to save draft')
      return
    }
    toast.success(`${PLATFORMS.find((p) => p.key === platform)?.label} draft saved`)
    onSaved?.()
  }

  function platformIcon(p: SocialPlatform, size = 16) {
    if (p === 'linkedin') return <LogoLinkedin size={size} />
    if (p === 'x') return <LogoX size={size} />
    if (p === 'facebook') return <LogoFacebook size={size} />
    return <LogoInstagram size={size} />
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full p-0 sm:max-w-xl flex flex-col"
      >
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Bullhorn size={18} className="text-primary" />
          <div className="flex-1 min-w-0">
            <SheetTitle>Generate social posts</SheetTitle>
            <SheetDescription className="truncate">
              {blogPost ? blogPost.title : 'No blog post selected'}
            </SheetDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={generate}
            disabled={!blogPost || streaming}
            title="Regenerate drafts"
          >
            <Renew size={16} className="mr-1.5" />
            {streaming ? 'Generating…' : 'Regenerate'}
          </Button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as SocialPlatform)}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <TabsList className="mx-4 mt-3">
              {PLATFORMS.map((p) => (
                <TabsTrigger key={p.key} value={p.key} className="gap-1.5">
                  {platformIcon(p.key, 14)}
                  {p.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {PLATFORMS.map((p) => (
              <TabsContent
                key={p.key}
                value={p.key}
                className="flex-1 overflow-hidden flex flex-col gap-3 px-4 pb-4 mt-3"
              >
                <textarea
                  value={drafts[p.key]}
                  onChange={(e) =>
                    setDrafts((prev) => ({ ...prev, [p.key]: e.target.value }))
                  }
                  placeholder={
                    streaming
                      ? 'Generating…'
                      : hasGenerated
                        ? 'Empty — regenerate or write your own.'
                        : 'Click Regenerate to draft from the article.'
                  }
                  className="flex-1 min-h-[280px] resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{drafts[p.key].length} chars</span>
                  <Button
                    size="sm"
                    onClick={() => savePlatform(p.key)}
                    disabled={
                      streaming ||
                      !drafts[p.key].trim() ||
                      savingPlatform === p.key
                    }
                  >
                    <Save size={14} className="mr-1.5" />
                    {savingPlatform === p.key ? 'Saving…' : 'Save draft'}
                  </Button>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  )
}
