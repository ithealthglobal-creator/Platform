'use client'

import { useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ColourPickerProps {
  label: string
  value: string
  onChange: (hex: string) => void
  optional?: boolean
}

const HEX_RE = /^#[0-9A-Fa-f]{6}$/

export function ColourPicker({
  label,
  value,
  onChange,
  optional = false,
}: ColourPickerProps) {
  const nativeRef = useRef<HTMLInputElement>(null)
  const [raw, setRaw] = useState(value)

  // Keep raw in sync when value changes externally (e.g. form reset)
  // We use an uncontrolled local draft so partial typing isn't rejected.
  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const text = e.target.value
    setRaw(text)
    if (HEX_RE.test(text)) {
      onChange(text)
    }
  }

  function handleTextBlur() {
    // On blur, snap back to valid value if raw is invalid
    if (!HEX_RE.test(raw)) {
      setRaw(value)
    }
  }

  function handleNativeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const hex = e.target.value // always #rrggbb from native picker
    setRaw(hex)
    onChange(hex)
  }

  const swatchColour = HEX_RE.test(raw) ? raw : value

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label className="font-poppins text-sm font-medium text-gray-700">
          {label}
        </Label>
        {optional && value && (
          <button
            type="button"
            onClick={() => {
              setRaw('')
              onChange('')
            }}
            className="font-poppins text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Input
          value={raw}
          onChange={handleTextChange}
          onBlur={handleTextBlur}
          placeholder="#000000"
          maxLength={7}
          className="font-poppins w-32 font-mono text-sm"
          spellCheck={false}
        />

        {/* Swatch — clicking it opens the hidden native colour picker */}
        <button
          type="button"
          aria-label="Pick colour"
          onClick={() => nativeRef.current?.click()}
          className="h-6 w-6 rounded border border-gray-300 shadow-sm hover:border-gray-400 transition-colors flex-shrink-0"
          style={{ backgroundColor: swatchColour || '#ffffff' }}
        />

        {/* Hidden native colour input */}
        <input
          ref={nativeRef}
          type="color"
          value={swatchColour || '#ffffff'}
          onChange={handleNativeChange}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
        />
      </div>

      {raw && !HEX_RE.test(raw) && (
        <p className="font-poppins text-xs text-red-500">
          Enter a valid hex colour, e.g. #1175E4
        </p>
      )}
    </div>
  )
}
