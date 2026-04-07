'use client'

import { AuthProvider } from '@/contexts/auth-context'
import { CustomerGuard } from '@/components/customer-guard'
import { MenuProvider } from '@/contexts/menu-context'
import { CartProvider } from '@/contexts/cart-context'
import { CustomerSidebar } from '@/components/customer-sidebar'

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CustomerGuard>
        <MenuProvider>
          <CartProvider>
            <div className="flex h-screen">
              <CustomerSidebar />
              <main className="flex-1 overflow-y-auto bg-[#f8fafc] p-7">
                {children}
              </main>
            </div>
          </CartProvider>
        </MenuProvider>
      </CustomerGuard>
    </AuthProvider>
  )
}
