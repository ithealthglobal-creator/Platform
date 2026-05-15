import { PublicHeader } from '@/components/public-header'
import { PublicFooter } from '@/components/public-footer'
import { FunnelPageTracker } from '@/components/funnel-page-tracker'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <FunnelPageTracker />
      <PublicHeader />
      <main>{children}</main>
      <PublicFooter />
    </>
  )
}
