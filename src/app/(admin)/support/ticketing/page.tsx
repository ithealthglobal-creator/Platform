'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TicketTable, TicketTableFilters } from '@/components/support/ticket-table'
import { TicketForm } from '@/components/support/ticket-form'
import { getTickets } from '@/lib/supabase/queries/support-tickets'
import { useAuth } from '@/contexts/auth-context'
import type { SupportTicket } from '@/lib/types'

const DEFAULT_FILTERS: TicketTableFilters = { category: 'all', status: 'all', priority: 'all' }

export default function TicketingPage() {
  const router = useRouter()
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<TicketTableFilters>(DEFAULT_FILTERS)
  const [newTicketOpen, setNewTicketOpen] = useState(false)

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    const { data, error } = await getTickets({
      category: filters.category !== 'all' ? filters.category : undefined,
      status: filters.status !== 'all' ? filters.status : undefined,
      priority: filters.priority !== 'all' ? filters.priority : undefined,
      search: search.trim() || undefined,
    })
    if (error) {
      toast.error('Failed to load tickets')
    } else {
      setTickets((data as SupportTicket[]) ?? [])
    }
    setLoading(false)
  }, [filters, search])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Support</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Ticketing</h1>
        </div>
        <div className="flex items-center gap-3">
          <Input
            placeholder="Search tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-[240px]"
          />
          {isAdmin && (
            <Button onClick={() => setNewTicketOpen(true)}>+ New Ticket</Button>
          )}
        </div>
      </div>

      <TicketTable
        tickets={tickets}
        loading={loading}
        onRowClick={(id) => router.push(`/support/ticketing/${id}`)}
        filters={filters}
        onFilterChange={setFilters}
      />

      <TicketForm
        open={newTicketOpen}
        onOpenChange={setNewTicketOpen}
        onSuccess={fetchTickets}
        isAdmin={isAdmin}
      />
    </div>
  )
}
