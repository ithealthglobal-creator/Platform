'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase-client'
import { CheckmarkFilled, ArrowLeft } from '@carbon/icons-react'
import Link from 'next/link'

const benefits = [
  'Free IT modernisation assessment',
  'Personalised modernisation roadmap',
  'Expert guidance at every stage',
  'Enterprise-grade solutions for SMBs',
]

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const { signIn, resetPassword } = useAuth()
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        if (profileData?.role === 'customer') {
          router.replace('/portal/home')
        } else {
          router.replace('/dashboard')
        }
      } else {
        router.replace('/dashboard')
      }
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await resetPassword(email)
    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      setResetSent(true)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel — branded */}
      <div className="hidden lg:flex lg:w-1/2 bg-[var(--brand-primary)] flex-col justify-between p-16 text-white">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logos/ithealth-logo-white.svg"
            alt="Logo"
            className="h-8 w-auto mb-16"
          />
          <h1 className="text-4xl font-bold leading-tight mb-6">
            Your Free IT<br />
            Modernisation<br />
            Journey Starts Here
          </h1>
          <p className="text-white/70 text-lg mb-12 max-w-md">
            We help small and medium-sized businesses grow stronger, smarter, and more
            successful by modernising their IT.
          </p>
          <ul className="space-y-4">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-center gap-3">
                <CheckmarkFilled size={20} className="text-[var(--brand-secondary)] shrink-0" />
                <span className="text-white/90">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-white/40 text-sm">
          &copy; {new Date().getFullYear()} All rights reserved.
        </p>
      </div>

      {/* Right panel — auth form */}
      <div className="relative flex w-full lg:w-1/2 items-center justify-center bg-white p-8">
        <Link href="/" className="absolute top-6 right-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-[var(--brand-dark)] transition-colors">
          <ArrowLeft size={16} />
          Back
        </Link>
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logos/ithealth-logo.svg"
              alt="Logo"
              className="h-8 w-auto"
            />
          </div>

          <h2 className="text-2xl font-bold text-[var(--brand-dark)] mb-2">
            {mode === 'login' ? 'Welcome back' : 'Reset your password'}
          </h2>
          <p className="text-muted-foreground mb-8">
            {mode === 'login' ? 'Sign in to your account to continue' : 'Enter your email to receive a reset link'}
          </p>

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
              <button type="button" onClick={() => { setMode('forgot'); setResetSent(false) }} className="w-full text-sm text-muted-foreground hover:underline">
                Forgot password?
              </button>
            </form>
          ) : resetSent ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">Check your email for a password reset link.</p>
              <button type="button" onClick={() => { setMode('login'); setResetSent(false) }} className="text-sm text-muted-foreground hover:underline">
                Back to login
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input id="reset-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90" disabled={loading}>
                {loading ? 'Sending...' : 'Send reset link'}
              </Button>
              <button type="button" onClick={() => setMode('login')} className="w-full text-sm text-muted-foreground hover:underline">
                Back to login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
