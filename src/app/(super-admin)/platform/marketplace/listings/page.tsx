'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase-client'
import { Store, CheckmarkFilled, CloseFilled } from '@carbon/icons-react'
import { toast } from 'sonner'

interface ListingRow {
  id: string
  company_id: string
  description: string | null
  is_featured: boolean
  is_active: boolean
  sort_order: number
  company: {
    id: string
    name: string
    domain: string | null
    slug: string | null
  } | null
}

export default function MarketplaceListingsPage() {
  const [listings, setListings] = useState<ListingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editingDesc, setEditingDesc] = useState<string | null>(null)
  const [descValue, setDescValue] = useState('')
  const descRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetchListings()
  }, [])

  useEffect(() => {
    if (editingDesc && descRef.current) {
      descRef.current.focus()
    }
  }, [editingDesc])

  async function fetchListings() {
    setLoading(true)

    const { data: listingsRaw, error } = await supabase
      .from('marketplace_listings')
      .select('id, company_id, description, is_featured, is_active, sort_order')
      .order('sort_order')

    if (error || !listingsRaw) {
      setLoading(false)
      return
    }

    // Fetch company data
    const rows: ListingRow[] = []
    for (const listing of listingsRaw) {
      const { data: company } = await supabase
        .from('companies')
        .select('id, name, domain, slug')
        .eq('id', listing.company_id)
        .maybeSingle()

      rows.push({ ...listing, company })
    }

    setListings(rows)
    setLoading(false)
  }

  async function toggleFeatured(listing: ListingRow) {
    const newVal = !listing.is_featured

    const { error } = await supabase
      .from('marketplace_listings')
      .update({ is_featured: newVal })
      .eq('id', listing.id)

    if (error) {
      toast.error('Failed to update featured status')
      return
    }

    setListings(prev =>
      prev.map(l => (l.id === listing.id ? { ...l, is_featured: newVal } : l))
    )
    toast.success(`${listing.company?.name ?? 'Listing'} ${newVal ? 'featured' : 'unfeatured'}`)
  }

  async function toggleActive(listing: ListingRow) {
    const newVal = !listing.is_active

    const { error } = await supabase
      .from('marketplace_listings')
      .update({ is_active: newVal })
      .eq('id', listing.id)

    if (error) {
      toast.error('Failed to update active status')
      return
    }

    setListings(prev =>
      prev.map(l => (l.id === listing.id ? { ...l, is_active: newVal } : l))
    )
    toast.success(`${listing.company?.name ?? 'Listing'} ${newVal ? 'activated' : 'deactivated'}`)
  }

  function startEditDesc(listing: ListingRow) {
    setEditingDesc(listing.id)
    setDescValue(listing.description ?? '')
  }

  async function saveDesc(listing: ListingRow) {
    const trimmed = descValue.trim()

    const { error } = await supabase
      .from('marketplace_listings')
      .update({ description: trimmed || null })
      .eq('id', listing.id)

    if (error) {
      toast.error('Failed to save description')
      return
    }

    setListings(prev =>
      prev.map(l => (l.id === listing.id ? { ...l, description: trimmed || null } : l))
    )
    setEditingDesc(null)
    toast.success('Description saved')
  }

  function cancelEdit() {
    setEditingDesc(null)
    setDescValue('')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-poppins text-2xl font-semibold text-gray-900">Marketplace Listings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Control which companies are visible in the Servolu Marketplace. Changes persist immediately.
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
            <p className="text-sm text-gray-500">No marketplace listings found.</p>
            <p className="text-xs text-gray-400">
              Add companies to marketplace_listings to see them here.
            </p>
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
                      <p className="font-medium text-gray-900">{listing.company?.name ?? listing.company_id}</p>
                      <p className="text-xs text-gray-400">{listing.company?.domain ?? listing.company?.slug ?? '—'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    {editingDesc === listing.id ? (
                      <div className="flex flex-col gap-2">
                        <textarea
                          ref={descRef}
                          value={descValue}
                          onChange={e => setDescValue(e.target.value)}
                          rows={3}
                          className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveDesc(listing)}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            <CheckmarkFilled size={14} />
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
                          >
                            <CloseFilled size={14} />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditDesc(listing)}
                        className="text-left w-full group"
                        title="Click to edit description"
                      >
                        {listing.description ? (
                          <span className="text-gray-600 text-sm line-clamp-2 group-hover:text-gray-900 transition-colors">
                            {listing.description}
                          </span>
                        ) : (
                          <span className="text-gray-300 italic text-sm group-hover:text-gray-400 transition-colors">
                            Click to add description
                          </span>
                        )}
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => toggleFeatured(listing)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${listing.is_featured ? 'bg-blue-600' : 'bg-gray-200'}`}
                      title={listing.is_featured ? 'Remove from featured' : 'Mark as featured'}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${listing.is_featured ? 'translate-x-4' : 'translate-x-0.5'}`}
                      />
                    </button>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => toggleActive(listing)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${listing.is_active ? 'bg-emerald-500' : 'bg-gray-200'}`}
                      title={listing.is_active ? 'Deactivate listing' : 'Activate listing'}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${listing.is_active ? 'translate-x-4' : 'translate-x-0.5'}`}
                      />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
