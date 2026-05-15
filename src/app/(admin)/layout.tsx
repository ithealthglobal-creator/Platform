'use client'

import { AuthProvider } from '@/contexts/auth-context'
import { AuthGuard } from '@/components/auth-guard'
import { MenuProvider } from '@/contexts/menu-context'
import { BrandingProvider } from '@/contexts/branding-context'
import { Sidebar } from '@/components/sidebar'
import { MegaMenu } from '@/components/mega-menu'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthGuard>
        <BrandingProvider>
        <MenuProvider>
          <div className="flex h-screen">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
              <MegaMenu />
              <main className="flex-1 overflow-y-auto bg-muted/50 p-6">
                {children}
              </main>
            </div>
          </div>
        </MenuProvider>
        </BrandingProvider>
      </AuthGuard>
    </AuthProvider>
  )
}
