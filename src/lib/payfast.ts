// src/lib/payfast.ts
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const PAYFAST_SANDBOX_URL = 'https://sandbox.payfast.co.za/eng/process'
const PAYFAST_LIVE_URL = 'https://www.payfast.co.za/eng/process'

export function generatePayFastSignature(data: Record<string, string>, passphrase: string): string {
  const params = Object.entries(data)
    .filter(([, v]) => v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v.trim()).replace(/%20/g, '+')}`)
    .join('&')

  const withPassphrase = `${params}&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, '+')}`
  return crypto.createHash('md5').update(withPassphrase).digest('hex')
}

export interface PayFastCredentials {
  merchantId: string
  merchantKey: string
  passphrase: string
  isSandbox: boolean
}

/**
 * Load PayFast credentials from the database (payfast_integrations table),
 * falling back to environment variables.
 *
 * NOTE: This function is server-only — it uses the service role key.
 */
export async function getPayFastCredentials(): Promise<PayFastCredentials | null> {
  // Try database first (payfast_integrations table)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data } = await supabaseAdmin
    .from('payfast_integrations')
    .select('*')
    .eq('is_active', true)
    .limit(1)
    .single()

  if (data?.merchant_id && data?.merchant_key_encrypted && data?.passphrase_encrypted) {
    return {
      merchantId: data.merchant_id,
      merchantKey: data.merchant_key_encrypted,
      passphrase: data.passphrase_encrypted,
      isSandbox: data.is_sandbox,
    }
  }

  // Fall back to environment variables
  if (process.env.PAYFAST_MERCHANT_ID && process.env.PAYFAST_MERCHANT_KEY && process.env.PAYFAST_PASSPHRASE) {
    return {
      merchantId: process.env.PAYFAST_MERCHANT_ID,
      merchantKey: process.env.PAYFAST_MERCHANT_KEY,
      passphrase: process.env.PAYFAST_PASSPHRASE,
      isSandbox: process.env.PAYFAST_SANDBOX === 'true',
    }
  }

  return null
}

export function buildPayFastFormData(options: {
  orderId: string
  total: number
  itemName: string
  billingEmail?: string
  baseUrl: string
  credentials: PayFastCredentials
}): { url: string; data: Record<string, string> } {
  const { credentials } = options

  const data: Record<string, string> = {
    merchant_id: credentials.merchantId,
    merchant_key: credentials.merchantKey,
    return_url: `${options.baseUrl}/portal/checkout/success?order_id=${options.orderId}`,
    cancel_url: `${options.baseUrl}/portal/checkout/cancel`,
    notify_url: `${options.baseUrl}/api/services/payfast-itn`,
    m_payment_id: options.orderId,
    amount: options.total.toFixed(2),
    item_name: options.itemName,
  }

  if (options.billingEmail) {
    data.email_address = options.billingEmail
  }

  data.signature = generatePayFastSignature(data, credentials.passphrase)

  return {
    url: credentials.isSandbox ? PAYFAST_SANDBOX_URL : PAYFAST_LIVE_URL,
    data,
  }
}

export function validatePayFastSignature(postData: Record<string, string>, passphrase: string): boolean {
  const receivedSignature = postData.signature
  const dataWithoutSignature = { ...postData }
  delete dataWithoutSignature.signature

  const calculated = generatePayFastSignature(dataWithoutSignature, passphrase)
  return calculated === receivedSignature
}
