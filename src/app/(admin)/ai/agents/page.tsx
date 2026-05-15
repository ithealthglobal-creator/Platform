'use client'

import { Suspense } from 'react'
import { AgentsWorkspace } from './agents-workspace'

export default function AgentsPage() {
  return (
    <Suspense fallback={null}>
      <AgentsWorkspace />
    </Suspense>
  )
}
