// src/app/api/services/payfast-itn/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { validatePayFastSignature } from '@/lib/payfast'

// PayFast valid IP ranges (sandbox + production)
const PAYFAST_IPS = [
  '197.97.145.144/28',
  '41.74.179.192/27',
  '197.110.64.128/27',
  // Sandbox
  '197.97.145.144/28',
]

function isPayFastIP(ip: string): boolean {
  // In sandbox mode, skip IP check
  if (process.env.PAYFAST_SANDBOX === 'true') return true
  // Simple check — in production, use a proper CIDR matching library
  return PAYFAST_IPS.some(range => ip.startsWith(range.split('/')[0].split('.').slice(0, 3).join('.')))
}

function calculateRenewalDate(startedAt: string, billingPeriod: string): string | null {
  const date = new Date(startedAt)
  switch (billingPeriod) {
    case 'monthly': date.setMonth(date.getMonth() + 1); return date.toISOString()
    case 'quarterly': date.setMonth(date.getMonth() + 3); return date.toISOString()
    case 'annually': date.setFullYear(date.getFullYear() + 1); return date.toISOString()
    default: return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const postData: Record<string, string> = {}
    formData.forEach((value, key) => { postData[key] = value.toString() })

    // Validate source IP
    const forwardedFor = req.headers.get('x-forwarded-for')
    const sourceIP = forwardedFor?.split(',')[0]?.trim() || '0.0.0.0'
    if (!isPayFastIP(sourceIP)) {
      console.error('PayFast ITN: invalid source IP', sourceIP)
      return NextResponse.json({ error: 'Invalid source' }, { status: 403 })
    }

    // Validate signature
    const passphrase = process.env.PAYFAST_PASSPHRASE!
    if (!validatePayFastSignature(postData, passphrase)) {
      console.error('PayFast ITN: invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }

    const orderId = postData.m_payment_id
    const paymentStatus = postData.payment_status

    // Fetch order to prevent double-processing
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (!order || order.status === 'paid') {
      return NextResponse.json({ ok: true })
    }

    // Verify amount matches
    const receivedAmount = parseFloat(postData.amount_gross)
    if (Math.abs(receivedAmount - order.total) > 0.01) {
      console.error('PayFast ITN: amount mismatch', { expected: order.total, received: receivedAmount })
      return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 })
    }

    if (paymentStatus === 'COMPLETE') {
      const now = new Date().toISOString()

      // Update order
      await supabaseAdmin
        .from('orders')
        .update({
          status: 'paid',
          payfast_payment_id: postData.pf_payment_id,
          payfast_status: paymentStatus,
          paid_at: now,
        })
        .eq('id', orderId)

      // Fetch order items
      const { data: orderItems } = await supabaseAdmin
        .from('order_items')
        .select('*')
        .eq('order_id', orderId)

      // Create customer contracts
      if (orderItems) {
        const contracts = orderItems.map(item => ({
          company_id: order.company_id,
          service_id: item.service_id,
          order_item_id: item.id,
          status: 'active',
          contracted_price: item.price,
          billing_period: item.billing_period,
          started_at: now,
          renewal_date: calculateRenewalDate(now, item.billing_period),
          payment_status: 'paid',
        }))

        await supabaseAdmin.from('customer_contracts').insert(contracts)
      }
    } else if (paymentStatus === 'CANCELLED') {
      await supabaseAdmin
        .from('orders')
        .update({ status: 'cancelled', payfast_status: paymentStatus })
        .eq('id', orderId)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('PayFast ITN error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
