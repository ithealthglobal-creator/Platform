// src/components/ads/image-upload.tsx
'use client'

import { useState, useRef, useCallback } from 'react'
import { CloudUpload, TrashCan } from '@carbon/icons-react'
import { supabase } from '@/lib/supabase-client'
import { toast } from 'sonner'

interface ImageUploadProps {
  imageUrl: string | null
  imageHash: string | null
  onUploaded: (imageHash: string, imageUrl: string) => void
  onRemoved: () => void
}

export default function ImageUpload({ imageUrl, imageHash, onUploaded, onRemoved }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadFile = useCallback(async (file: File) => {
    const validTypes = ['image/jpeg', 'image/png']
    if (!validTypes.includes(file.type)) {
      toast.error('Only JPG and PNG files are allowed')
      return
    }
    if (file.size > 30 * 1024 * 1024) {
      toast.error('File must be under 30MB')
      return
    }

    setUploading(true)
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/admin/ads/meta/creatives/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      if (!res.ok) {
        const { error } = await res.json()
        toast.error(error || 'Upload failed')
        return
      }

      const { image_hash, image_url } = await res.json()
      onUploaded(image_hash, image_url)
      toast.success('Image uploaded')
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }, [onUploaded])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) uploadFile(file)
  }, [uploadFile])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
  }

  if (imageUrl && imageHash) {
    return (
      <div className="relative rounded-lg border overflow-hidden">
        <img src={imageUrl} alt="Ad creative" className="w-full aspect-video object-cover" />
        <button
          type="button"
          onClick={() => { onRemoved(); if (fileInputRef.current) fileInputRef.current.value = '' }}
          className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-md hover:bg-red-50 text-red-500 transition-colors"
        >
          <TrashCan size={16} />
        </button>
      </div>
    )
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-8 cursor-pointer transition-colors ${
        dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'
      } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
    >
      <CloudUpload size={32} className="text-muted-foreground" />
      <div className="text-sm text-muted-foreground text-center">
        {uploading ? 'Uploading...' : 'Drag and drop an image here, or click to browse'}
      </div>
      <div className="text-xs text-muted-foreground">JPG or PNG, max 30MB</div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}
