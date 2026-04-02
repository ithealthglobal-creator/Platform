'use client'

import { AuthGuard } from '@/components/auth-guard'
import { MenuProvider } from '@/contexts/menu-context'
import { Sidebar } from '@/components/sidebar'
import { MegaMenu } from '@/components/mega-menu'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <MenuProvider>
        <div className="flex h-screen">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <MegaMenu />
            <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
              {children}
            </main>
          </div>
        </div>
      </MenuProvider>
    </AuthGuard>
  )
}
