// src/lib/payfast.ts
import crypto from 'crypto'

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

export function buildPayFastFormData(options: {
  orderId: string
  total: number
  itemName: string
  billingEmail?: string
  baseUrl: string
}): { url: string; data: Record<string, string> } {
  const merchantId = process.env.PAYFAST_MERCHANT_ID!
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY!
  const passphrase = process.env.PAYFAST_PASSPHRASE!
  const isSandbox = process.env.PAYFAST_SANDBOX === 'true'

  const data: Record<string, string> = {
    merchant_id: merchantId,
    merchant_key: merchantKey,
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

  data.signature = generatePayFastSignature(data, passphrase)

  return {
    url: isSandbox ? PAYFAST_SANDBOX_URL : PAYFAST_LIVE_URL,
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
