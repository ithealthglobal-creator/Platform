'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase-client'
import type { Order, CustomerContract } from '@/lib/types'

function statusBadge(status: string) {
  const map: Record<string, string> = {
    paid: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    overdue: 'bg-red-100 text-red-700',
    completed: 'bg-green-100 text-green-700',
    processing: 'bg-blue-100 text-blue-700',
    cancelled: 'bg-slate-100 text-slate-500',
    na: 'bg-slate-100 text-slate-500',
  }
  return map[status] ?? 'bg-slate-100 text-slate-600'
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount)
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function periodLabel(period: string) {
  const map: Record<string, string> = { once: 'Once-off', monthly: 'Monthly', quarterly: 'Quarterly', annually: 'Annually' }
  return map[period] ?? period
}

export default function BillingPage() {
  const { profile } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [contracts, setContracts] = useState<CustomerContract[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'invoices' | 'subscriptions'>('invoices')

  useEffect(() => {
    if (!profile?.company_id) return
    async function load() {
      setLoading(true)
      const [{ data: orderData }, { data: contractData }] = await Promise.all([
        supabase
          .from('orders')
          .select('*, order_items(*, service:services(id, name))')
          .eq('company_id', profile!.company_id)
          .order('created_at', { ascending: false }),
        supabase
          .from('customer_contracts')
          .select('*, service:services(id, name)')
          .eq('company_id', profile!.company_id)
          .order('created_at', { ascending: false }),
      ])
      setOrders((orderData as Order[]) ?? [])
      setContracts((contractData as CustomerContract[]) ?? [])
      setLoading(false)
    }
    load()
  }, [profile])

  // Summary calculations
  const totalOutstanding = orders
    .filter(o => o.status !== 'cancelled' && !o.paid_at)
    .reduce((sum, o) => sum + o.total, 0)
  const totalPaid = orders
    .filter(o => !!o.paid_at)
    .reduce((sum, o) => sum + o.total, 0)
  const activeContracts = contracts.filter(c => c.status === 'active')
  const monthlyRecurring = activeContracts
    .filter(c => c.billing_period === 'monthly')
    .reduce((sum, c) => sum + c.contracted_price, 0)

  if (loading) {
    return (
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Billing</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Billing & Invoices</h1>
        <div className="mt-6 flex items-center justify-center rounded-xl border border-slate-200 bg-white p-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#1175E4]" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Billing</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900">Billing &amp; Invoices</h1>

      {/* Summary Cards */}
      <div className="mt-6 grid grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Outstanding</p>
          <p className="mt-3 text-2xl font-bold text-orange-600">{formatCurrency(totalOutstanding)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Total Paid</p>
          <p className="mt-3 text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Active Subscriptions</p>
          <p className="mt-3 text-2xl font-bold text-[#1175E4]">{activeContracts.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Monthly Recurring</p>
          <p className="mt-3 text-2xl font-bold text-slate-900">{formatCurrency(monthlyRecurring)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white">
        <div className="flex border-b border-slate-200">
          {(['invoices', 'subscriptions'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'invoices' && (
            <InvoicesTable orders={orders} />
          )}
          {activeTab === 'subscriptions' && (
            <SubscriptionsTable contracts={contracts} />
          )}
        </div>
      </div>
    </div>
  )
}

function InvoicesTable({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">No invoices yet.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
            <th className="px-4 py-3">Invoice #</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Items</th>
            <th className="px-4 py-3 text-right">Subtotal</th>
            <th className="px-4 py-3 text-right">VAT</th>
            <th className="px-4 py-3 text-right">Total</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {orders.map(order => {
            const items = order.order_items ?? []
            const isPaid = !!order.paid_at
            const isPayable = !isPaid && order.status !== 'cancelled'

            return (
              <tr key={order.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{order.order_number}</td>
                <td className="px-4 py-3 text-slate-500">{formatDate(order.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="max-w-[200px]">
                    {items.map(item => (
                      <p key={item.id} className="truncate text-xs text-slate-600">
                        {(item.service as { name: string } | undefined)?.name ?? 'Service'}
                      </p>
                    ))}
                    {items.length === 0 && <span className="text-xs text-slate-400">—</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(order.subtotal)}</td>
                <td className="px-4 py-3 text-right text-slate-400">{formatCurrency(order.vat_amount)}</td>
                <td className="px-4 py-3 text-right font-medium text-slate-800">{formatCurrency(order.total)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                    isPaid ? statusBadge('paid') : statusBadge(order.status)
                  }`}>
                    {isPaid ? 'Paid' : order.status === 'cancelled' ? 'Cancelled' : 'Unpaid'}
                  </span>
                  {order.paid_at && (
                    <p className="mt-0.5 text-[10px] text-slate-400">{formatDate(order.paid_at)}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  {isPayable && (
                    <a
                      href={`/portal/checkout?order=${order.id}`}
                      className="inline-flex items-center rounded-lg bg-[#1175E4] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#0d5fc4]"
                    >
                      Pay Now
                    </a>
                  )}
                  {isPaid && (
                    <span className="text-xs text-slate-400">Receipt sent</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function SubscriptionsTable({ contracts }: { contracts: CustomerContract[] }) {
  if (contracts.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">No active subscriptions.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
            <th className="px-4 py-3">Service</th>
            <th className="px-4 py-3">Billing</th>
            <th className="px-4 py-3 text-right">Price</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Payment</th>
            <th className="px-4 py-3">Started</th>
            <th className="px-4 py-3">Next Renewal</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {contracts.map(contract => (
            <tr key={contract.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-800">
                {(contract.service as { name: string } | undefined)?.name ?? '—'}
              </td>
              <td className="px-4 py-3 text-slate-500">{periodLabel(contract.billing_period)}</td>
              <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(contract.contracted_price)}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusBadge(contract.status)}`}>
                  {contract.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusBadge(contract.payment_status)}`}>
                  {contract.payment_status}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-500">
                {contract.started_at ? formatDate(contract.started_at) : '—'}
              </td>
              <td className="px-4 py-3 text-slate-500">
                {contract.renewal_date ? formatDate(contract.renewal_date) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
