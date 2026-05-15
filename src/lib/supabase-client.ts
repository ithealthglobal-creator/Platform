import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const isDev = process.env.NODE_ENV !== 'production'

const globalForSupabase = globalThis as unknown as {
  __supabase?: SupabaseClient
}

// In dev, multiple tabs / HMR realms race for `navigator.locks.request("lock:sb-...-auth-token")`,
// producing noisy `NavigatorLockAcquireTimeoutError: lock was released because another request stole it`.
// Bypassing the lock in dev is safe (single user, single session); production keeps the default
// navigator-lock behavior so cross-tab token refresh stays coordinated.
const noopLock = async <R,>(
  _name: string,
  _acquireTimeout: number,
  fn: () => Promise<R>,
): Promise<R> => fn()

function buildClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: isDev ? { lock: noopLock } : undefined,
  })
}

export const supabase = globalForSupabase.__supabase ?? buildClient()

if (isDev) {
  globalForSupabase.__supabase = supabase
}
