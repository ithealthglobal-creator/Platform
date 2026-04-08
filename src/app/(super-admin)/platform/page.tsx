'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { Building, Store, Group, Dashboard } from '@carbon/icons-react'

interface Stats {
  adminCompanies: number
  customerCompanies: number
  services: number
  users: number
}

export default function PlatformDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      const [adminRes, customerRes, servicesRes, usersRes] = await Promise.all([
        supabase.from('companies').select('id', { count: 'exact', head: true }).eq('type', 'admin'),
        supabase.from('companies').select('id', { count: 'exact', head: true }).eq('type', 'customer'),
        supabase.from('services').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
      ])

      setStats({
        adminCompanies: adminRes.count ?? 0,
        customerCompanies: customerRes.count ?? 0,
        services: servicesRes.count ?? 0,
        users: usersRes.count ?? 0,
      })
      setLoading(false)
    }

    fetchStats()
  }, [])

  const cards = [
    {
      label: 'Admin Companies',
      value: stats?.adminCompanies,
      icon: <Building size={24} className="text-blue-600" />,
      bg: 'bg-blue-50',
    },
    {
      label: 'Customer Companies',
      value: stats?.customerCompanies,
      icon: <Store size={24} className="text-emerald-600" />,
      bg: 'bg-emerald-50',
    },
    {
      label: 'Total Services',
      value: stats?.services,
      icon: <Dashboard size={24} className="text-violet-600" />,
      bg: 'bg-violet-50',
    },
    {
      label: 'Total Users',
      value: stats?.users,
      icon: <Group size={24} className="text-amber-600" />,
      bg: 'bg-amber-50',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-poppins text-2xl font-semibold text-gray-900">Platform Overview</h1>
        <p className="mt-1 text-sm text-gray-500">High-level metrics across all companies and users.</p>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {cards.map(card => (
          <div key={card.label} className="bg-white rounded-lg border p-6">
            {loading ? (
              <div className="space-y-3">
                <div className="h-10 w-10 rounded-lg bg-gray-100 animate-pulse" />
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.bg}`}>
                  {card.icon}
                </div>
                <p className="text-3xl font-bold text-gray-900 font-poppins">{card.value ?? 0}</p>
                <p className="text-sm text-gray-500">{card.label}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
