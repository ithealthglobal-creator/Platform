'use client'

import { Suspense } from 'react'
import { TemplatesWorkspace } from './templates-workspace'

export default function TemplatesPage() {
  return (
    <Suspense fallback={null}>
      <TemplatesWorkspace />
    </Suspense>
  )
}
