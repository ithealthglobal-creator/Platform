'use client'

import { useEffect, useRef, useState } from 'react'
import { GOOGLE_FONTS } from '@/lib/google-fonts'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

interface FontSelectorProps {
  label: string
  value: string
  onChange: (fontName: string) => void
}

const PREVIEW_TEXT = 'The Quick Brown Fox Jumps Over The Lazy Dog'

function buildGoogleFontUrl(fontName: string): string {
  if (!fontName) return ''
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@400;500;600;700&display=swap`
}

const loadedFonts = new Set<string>()

function ensureFontLoaded(fontName: string) {
  if (!fontName || loadedFonts.has(fontName)) return
  const href = buildGoogleFontUrl(fontName)
  if (!href) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  link.setAttribute('data-font-selector', fontName)
  document.head.appendChild(link)
  loadedFonts.add(fontName)
}

export function FontSelector({ label, value, onChange }: FontSelectorProps) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Load the currently selected font for the preview
  useEffect(() => {
    if (value) ensureFontLoaded(value)
  }, [value])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const filtered = search.trim()
    ? GOOGLE_FONTS.filter((f) =>
        f.name.toLowerCase().includes(search.toLowerCase())
      )
    : GOOGLE_FONTS

  function handleSelect(fontName: string) {
    ensureFontLoaded(fontName)
    onChange(fontName)
    setOpen(false)
    setSearch('')
  }

  return (
    <div className="flex flex-col gap-2">
      <Label className="font-poppins text-sm font-medium text-gray-700">
        {label}
      </Label>

      {/* Trigger button + dropdown */}
      <div ref={containerRef} className="relative w-full max-w-xs">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring font-poppins"
        >
          <span>{value || 'Select a font…'}</span>
          <svg
            className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
            {/* Search */}
            <div className="p-2 border-b border-gray-100">
              <Input
                autoFocus
                placeholder="Search fonts…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="font-poppins h-8 text-sm"
              />
            </div>

            {/* Options list */}
            <ul className="max-h-56 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <li className="px-3 py-2 font-poppins text-sm text-gray-400">
                  No fonts found
                </li>
              ) : (
                filtered.map((font) => (
                  <li key={font.name}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        // Prevent the input blur from closing before click registers
                        e.preventDefault()
                        handleSelect(font.name)
                      }}
                      className={[
                        'flex w-full items-center justify-between px-3 py-1.5 text-sm hover:bg-gray-50 font-poppins',
                        value === font.name
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-700',
                      ].join(' ')}
                    >
                      <span>{font.name}</span>
                      <span className="text-xs text-gray-400 capitalize">
                        {font.category}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Live font preview */}
      {value && (
        <p
          className="mt-1 text-base text-gray-700 leading-relaxed"
          style={{ fontFamily: `'${value}', sans-serif` }}
        >
          {PREVIEW_TEXT}
        </p>
      )}
    </div>
  )
}
