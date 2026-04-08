// src/components/ads/targeting-search.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Close } from '@carbon/icons-react'
import { supabase } from '@/lib/supabase-client'

interface TargetingOption {
  id?: string
  key?: string
  name: string
  type?: string
  country_code?: string
  audience_size_lower_bound?: number
  audience_size_upper_bound?: number
}

interface TargetingSearchProps {
  type: 'interests' | 'locations'
  selected: TargetingOption[]
  onChange: (selected: TargetingOption[]) => void
  placeholder?: string
}

export default function TargetingSearch({ type, selected, onChange, placeholder }: TargetingSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TargetingOption[]>([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const endpoint = type === 'interests'
        ? `/api/admin/ads/meta/targeting/interests?q=${encodeURIComponent(query)}`
        : `/api/admin/ads/meta/targeting/locations?q=${encodeURIComponent(query)}`

      try {
        const res = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const { data } = await res.json()
          setResults(data || [])
          setShowDropdown(true)
        }
      } catch {
        setResults([])
      }
      setLoading(false)
    }, 300)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, type])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const addItem = (item: TargetingOption) => {
    const key = item.id || item.key || item.name
    if (!selected.find(s => (s.id || s.key || s.name) === key)) {
      onChange([...selected, item])
    }
    setQuery('')
    setShowDropdown(false)
  }

  const removeItem = (item: TargetingOption) => {
    const key = item.id || item.key || item.name
    onChange(selected.filter(s => (s.id || s.key || s.name) !== key))
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Tag chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((item) => (
            <span
              key={item.id || item.key || item.name}
              className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-1 rounded-md"
            >
              {item.name}
              <button type="button" onClick={() => removeItem(item)} className="hover:text-red-500">
                <Close size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setShowDropdown(true)}
        placeholder={placeholder || `Search ${type}...`}
      />

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">Searching...</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">No results</div>
          ) : (
            results.map((item) => (
              <button
                key={item.id || item.key || item.name}
                type="button"
                onClick={() => addItem(item)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                <div className="font-medium">{item.name}</div>
                {item.type && (
                  <div className="text-xs text-muted-foreground">
                    {item.type}{item.country_code ? ` · ${item.country_code}` : ''}
                    {item.audience_size_lower_bound ? ` · ${(item.audience_size_lower_bound / 1000000).toFixed(1)}M–${((item.audience_size_upper_bound || 0) / 1000000).toFixed(1)}M` : ''}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
