'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Upload, TrashCan } from '@carbon/icons-react'
import { supabase } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface ImageFieldProps {
  label: string
  value: string | null
  companyId: string
  path: string
  onUploaded: (url: string | null) => void
}

export function ImageField({
  label,
  value,
  companyId,
  path,
  onUploaded,
}: ImageFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    setError(null)

    if (file.size > 5 * 1024 * 1024) {
      setError('File must be under 5 MB')
      return
    }

    const allowed = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp']
    if (!allowed.includes(file.type)) {
      setError('Only SVG, PNG, JPG and WebP files are allowed')
      return
    }

    setUploading(true)

    const storagePath = `${companyId}/${path}`

    const { error: uploadError } = await supabase.storage
      .from('website-content')
      .upload(storagePath, file, { upsert: true })

    if (uploadError) {
      setError(uploadError.message)
      setUploading(false)
      return
    }

    const { data } = supabase.storage
      .from('website-content')
      .getPublicUrl(storagePath)

    onUploaded(data.publicUrl)
    setUploading(false)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  function handleRemove() {
    setError(null)
    onUploaded(null)
  }

  return (
    <div className="flex flex-col gap-2">
      <Label className="font-poppins text-sm font-medium text-gray-700">
        {label}
      </Label>

      {value ? (
        <div className="flex items-start gap-3">
          <div className="relative h-24 w-40 overflow-hidden rounded-md border border-gray-200 bg-gray-50">
            <Image
              src={value}
              alt={label}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
          <div className="flex flex-col gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="font-poppins"
            >
              <Upload size={14} className="mr-1.5" />
              Replace
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={uploading}
              onClick={handleRemove}
              className="font-poppins text-gray-500 hover:text-red-600"
            >
              <TrashCan size={14} className="mr-1.5" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {uploading ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
              <span className="font-poppins text-xs text-gray-500">Uploading…</span>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="font-poppins"
            >
              <Upload size={14} className="mr-1.5" />
              Upload image
            </Button>
          )}
        </div>
      )}

      {error && (
        <p className="font-poppins text-xs text-red-600">{error}</p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".svg,.png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  )
}
