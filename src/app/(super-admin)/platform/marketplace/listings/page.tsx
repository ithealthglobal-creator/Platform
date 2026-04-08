'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { Company } from '@/lib/types'
import { Store } from '@carbon/icons-react'

interface ListingRow extends Company {
  featured: boolean
  active: boolean
}

export default function MarketplaceListingsPage() {
  const [listings, setListings] = useState<ListingRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchListings() {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('type', 'admin')
        .order('name')

      if (error || !data) {
        setLoading(false)
        return
      }

      // Stub: derive featured/active from company status for now
      const rows: ListingRow[] = (data as Company[]).map(c => ({
        ...c,
        featured: false,
        active: c.status === 'active',
      }))

      setListings(rows)
      setLoading(false)
    }

    fetchListings()
  }, [])

  function toggleFeatured(id: string) {
    setListings(prev =>
      prev.map(l => (l.id === id ? { ...l, featured: !l.featured } : l))
    )
  }

  function toggleActive(id: string) {
    setListings(prev =>
      prev.map(l => (l.id === id ? { ...l, active: !l.active } : l))
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-poppins text-2xl font-semibold text-gray-900">Marketplace Listings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Control which admin companies are visible in the marketplace. Full configuration coming in Phase 5.
        </p>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        {loading ? (
          <div className="divide-y">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-64 bg-gray-100 rounded animate-pulse flex-1" />
                <div className="h-6 w-12 bg-gray-100 rounded animate-pulse" />
                <div className="h-6 w-12 bg-gray-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="px-6 py-12 flex flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <Store size={24} className="text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">No admin companies found.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Featured</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {listings.map(listing => (
                <tr key={listing.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{listing.name}</p>
                      <p className="text-xs text-gray-400">{listing.domain ?? '—'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500 max-w-xs truncate">
                    {listing.tagline ?? <span className="text-gray-300 italic">No tagline</span>}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => toggleFeatured(listing.id)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${listing.featured ? 'bg-blue-600' : 'bg-gray-200'}`}
                      title="Toggle featured"
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${listing.featured ? 'translate-x-4' : 'translate-x-0.5'}`}
                      />
                    </button>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => toggleActive(listing.id)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${listing.active ? 'bg-emerald-500' : 'bg-gray-200'}`}
                      title="Toggle active"
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${listing.active ? 'translate-x-4' : 'translate-x-0.5'}`}
                      />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-gray-400 text-right">
        Note: Toggle state is UI-only in this phase. Persistence will be added in Phase 5.
      </p>
    </div>
  )
}
