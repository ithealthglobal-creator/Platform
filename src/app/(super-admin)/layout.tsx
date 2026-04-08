'use client'

import { AuthProvider } from '@/contexts/auth-context'
import { SuperAdminGuard } from '@/components/super-admin-guard'
import { BrandingProvider } from '@/contexts/branding-context'
import { SuperAdminSidebar } from '@/components/super-admin-sidebar'

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SuperAdminGuard>
        <BrandingProvider>
          <div className="flex h-screen">
            <SuperAdminSidebar />
            <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
              {children}
            </main>
          </div>
        </BrandingProvider>
      </SuperAdminGuard>
    </AuthProvider>
  )
}
