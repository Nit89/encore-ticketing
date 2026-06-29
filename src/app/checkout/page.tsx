'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { SiteHeader } from '@/components/site-header'
import { Ticket, CheckCircle, Loader2, AlertCircle } from 'lucide-react'

function CheckoutContent() {
  const params = useSearchParams()
  const router = useRouter()

  const seatId = params.get('seatId') ?? ''
  const eventId = params.get('eventId') ?? ''
  const row = params.get('row') ?? ''
  const number = params.get('number') ?? ''
  const section = params.get('section') ?? ''
  const price = params.get('price') ?? '0'

  const [buyerName, setBuyerName] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    orderId?: string
    message: string
    retries?: number
  } | null>(null)
  const [timeLeft, setTimeLeft] = useState(16)

  // 10-second countdown — matches DynamoDB TTL
  useEffect(() => {
    if (result) return
    if (timeLeft <= 0) {
      router.push('/')
      return
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearTimeout(timer)
  }, [timeLeft, result, router])

  async function handleCheckout() {
    if (!buyerName || !buyerEmail) return
    setLoading(true)

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          seatId,
          userSession: sessionStorage.getItem('encore-session') ?? '',
          buyerName,
          buyerEmail,
        }),
      })

      const data = await res.json()
      setResult(data)
    } catch {
      setResult({ success: false, message: 'Network error. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  // Success state
  if (result?.success) {
    return (
      <div className="flex flex-col items-center gap-6 py-20 text-center">
        <CheckCircle className="size-16 text-green-400" />
        <h2 className="text-3xl font-bold">You're in!</h2>
        <p className="text-muted-foreground">
          Row {row} · Seat {number} · {section}
        </p>
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-8 py-4">
          <p className="text-xs text-muted-foreground">Order ID</p>
          <p className="font-mono text-sm text-primary">{result.orderId}</p>
          {(result.retries ?? 0) > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              OCC retries: {result.retries} — DSQL guaranteed no oversell
            </p>
          )}
        </div>
        <button
          onClick={() => router.push('/')}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Back to events
        </button>
      </div>
    )
  }

  // Failure state
  if (result && !result.success) {
    return (
      <div className="flex flex-col items-center gap-6 py-20 text-center">
        <AlertCircle className="size-16 text-red-400" />
        <h2 className="text-3xl font-bold">Seat Taken</h2>
        <p className="text-muted-foreground">{result.message}</p>
        <button
          onClick={() => router.push('/')}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Choose another seat
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      {/* Countdown timer */}
      <div className="flex items-center justify-between rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3">
        <p className="text-sm text-yellow-400">Seat held for</p>
        <p className={`font-mono text-2xl font-bold ${timeLeft <= 3 ? 'text-red-400' : 'text-yellow-400'}`}>
          0:{String(timeLeft).padStart(2, '0')}
        </p>
      </div>

      {/* Seat summary */}
      <div className="rounded-xl border border-primary/20 bg-card p-4">
        <div className="flex items-center gap-3">
          <Ticket className="size-6 text-primary" />
          <div>
            <p className="font-semibold">Row {row} · Seat {number}</p>
            <p className="text-sm text-muted-foreground">{section} · ${price}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Full name</label>
          <input
            type="text"
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            placeholder="Your name"
            className="rounded-lg border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Email</label>
          <input
            type="email"
            value={buyerEmail}
            onChange={(e) => setBuyerEmail(e.target.value)}
            placeholder="your@email.com"
            className="rounded-lg border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>

        <button
          onClick={handleCheckout}
          disabled={loading || !buyerName || !buyerEmail}
          className="flex items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {loading && <Loader2 className="size-4 animate-spin" />}
          {loading ? 'Processing...' : `Complete Purchase · $${price}`}
        </button>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10">
        <h1 className="text-center text-3xl font-bold">Complete your purchase</h1>
        <Suspense fallback={<Loader2 className="mx-auto size-8 animate-spin text-primary" />}>
          <CheckoutContent />
        </Suspense>
      </main>
    </>
  )
}
