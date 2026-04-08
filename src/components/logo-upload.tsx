'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Upload } from '@carbon/icons-react'
import { supabase } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface LogoUploadProps {
  label: string
  value: string | null
  companyId: string
  storagePath: string
  onUploaded: (url: string | null) => void
}

export function LogoUpload({
  label,
  value,
  companyId,
  storagePath,
  onUploaded,
}: LogoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    setError(null)

    if (file.size > 2 * 1024 * 1024) {
      setError('File must be under 2 MB')
      return
    }

    const allowed = ['image/svg+xml', 'image/png', 'image/jpeg']
    if (!allowed.includes(file.type)) {
      setError('Only SVG, PNG and JPG files are allowed')
      return
    }

    setUploading(true)

    const path = `${companyId}/${storagePath}`

    const { error: uploadError } = await supabase.storage
      .from('branding')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setError(uploadError.message)
      setUploading(false)
      return
    }

    const { data } = supabase.storage.from('branding').getPublicUrl(path)
    onUploaded(data.publicUrl)
    setUploading(false)
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(true)
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    // Reset so the same file can be re-uploaded if needed
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

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={[
          'flex min-h-[120px] flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-4 transition-colors',
          dragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-gray-50',
        ].join(' ')}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
            <span className="font-poppins text-xs text-gray-500">
              Uploading…
            </span>
          </div>
        ) : value ? (
          <div className="flex flex-col items-center gap-2">
            <div className="relative h-16 w-40 overflow-hidden rounded">
              <Image
                src={value}
                alt={label}
                fill
                className="object-contain"
                unoptimized
              />
            </div>
            <span className="font-poppins text-xs text-gray-400">
              Drag a new file to replace
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Upload size={24} className="text-gray-400" />
            <span className="font-poppins text-sm text-gray-500">
              Drag &amp; drop or click Upload
            </span>
            <span className="font-poppins text-xs text-gray-400">
              SVG, PNG, JPG — max 2 MB
            </span>
          </div>
        )}
      </div>

      {error && (
        <p className="font-poppins text-xs text-red-600">{error}</p>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="font-poppins"
        >
          <Upload size={14} className="mr-1.5" />
          Upload
        </Button>

        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={uploading}
            onClick={handleRemove}
            className="font-poppins text-gray-500 hover:text-red-600"
          >
            Remove
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".svg,.png,.jpg,.jpeg"
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  )
}
