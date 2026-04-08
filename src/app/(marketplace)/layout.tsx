import { MarketplaceHeader } from '@/components/marketplace/marketplace-header'
import { MarketplaceFooter } from '@/components/marketplace/marketplace-footer'

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MarketplaceHeader />
      <main>{children}</main>
      <MarketplaceFooter />
    </>
  )
}
