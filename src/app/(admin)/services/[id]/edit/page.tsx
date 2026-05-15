'use client'

import { useParams, useRouter } from 'next/navigation'
import { ServiceEditorWorkspace } from '@/components/services/service-editor-workspace'

export default function ServiceEditorPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const isNew = id === 'new'

  return (
    <div className="-m-6 flex h-full">
      <ServiceEditorWorkspace
        serviceId={isNew ? null : id}
        onServiceCreated={(newId) => router.replace(`/services/${newId}/edit`)}
      />
    </div>
  )
}
