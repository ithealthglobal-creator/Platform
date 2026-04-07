// src/app/api/services/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { buildPayFastFormData, getPayFastCredentials } from '@/lib/payfast'
import { createClient } from '@supabase/supabase-js'

interface CheckoutItem {
  service_id: string
  price: number
  billing_period: string
}

export async function POST(req: NextRequest) {
  try {
    // Validate user session
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')
    const supabaseAuth = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get profile to verify company_id
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, company_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const body = await req.json()
    const { items, billing_email, po_number, notes } = body as {
      items: CheckoutItem[]
      billing_email: string
      po_number?: string
      notes?: string
    }

    const profile_id = profile.id
    const company_id = profile.company_id

    if (!items?.length) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    const subtotal = items.reduce((sum, i) => sum + i.price, 0)
    const vatAmount = Math.round(subtotal * 0.15 * 100) / 100
    const total = Math.round((subtotal + vatAmount) * 100) / 100

    // Create order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        company_id,
        profile_id,
        status: 'pending',
        subtotal,
        vat_amount: vatAmount,
        total,
        billing_email,
        po_number: po_number || null,
        notes: notes || null,
      })
      .select()
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }

    // Create order items
    const orderItems = items.map(i => ({
      order_id: order.id,
      service_id: i.service_id,
      price: i.price,
      billing_period: i.billing_period,
    }))

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      return NextResponse.json({ error: 'Failed to create order items' }, { status: 500 })
    }

    // Generate PayFast form data
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
    const itemName = items.length === 1 ? 'IThealth Service' : `IThealth Services (${items.length})`

    const credentials = await getPayFastCredentials()
    if (!credentials) {
      return NextResponse.json({ error: 'Payment gateway not configured' }, { status: 503 })
    }

    const payfast = buildPayFastFormData({
      orderId: order.id,
      total,
      itemName,
      billingEmail: billing_email,
      baseUrl,
      credentials,
    })

    return NextResponse.json({
      order_id: order.id,
      order_number: order.order_number,
      payfast_url: payfast.url,
      payfast_data: payfast.data,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
