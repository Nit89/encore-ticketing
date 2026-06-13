'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArmchairIcon, CheckCircle2, Loader2 } from 'lucide-react'

interface CheckoutFormProps {
  seatId: string
}

type CheckoutState = 'form' | 'processing' | 'confirmed'

export function CheckoutForm({ seatId }: CheckoutFormProps) {
  const [state, setState] = useState<CheckoutState>('form')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [orderId, setOrderId] = useState('')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setState('processing')
    setOrderId(`ENC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`)
    // Simulate purchase processing
    setTimeout(() => setState('confirmed'), 1200)
  }

  if (state === 'confirmed') {
    return (
      <div className="flex flex-col items-center gap-6 rounded-2xl border border-primary/40 bg-card p-8 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-primary/15">
          <CheckCircle2 className="size-9 text-primary" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold">You&apos;re in!</h2>
          <p className="text-sm text-muted-foreground">
            Your ticket is confirmed. See you at the show.
          </p>
        </div>
        <dl className="grid w-full grid-cols-2 gap-4 rounded-xl border border-border bg-background p-4 text-left">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Order</dt>
            <dd className="font-mono text-sm font-semibold text-primary">{orderId}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Seat</dt>
            <dd className="font-mono text-sm font-semibold">{seatId}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Name</dt>
            <dd className="truncate text-sm font-semibold">{name}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Email</dt>
            <dd className="truncate text-sm font-semibold">{email}</dd>
          </div>
        </dl>
        <Link
          href="/"
          className="rounded-lg border border-primary/40 px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
        >
          Back to seat map
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Selected seat summary */}
      <div className="flex items-center justify-between rounded-2xl border border-primary/40 bg-card p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-lg bg-primary/15">
            <ArmchairIcon className="size-6 text-primary" aria-hidden="true" />
          </span>
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Your held seat
            </span>
            <span className="font-mono text-xl font-bold text-primary">{seatId}</span>
          </div>
        </div>
        <span className="rounded-full bg-seat-held/20 px-3 py-1 text-xs font-semibold text-seat-held">
          Held for you
        </span>
      </div>

      {/* Buyer form */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6"
      >
        <div className="flex flex-col gap-2">
          <label htmlFor="buyer-name" className="text-sm font-medium">
            Full name
          </label>
          <input
            id="buyer-name"
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jordan Rivers"
            disabled={state === 'processing'}
            className="rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="buyer-email" className="text-sm font-medium">
            Email address
          </label>
          <input
            id="buyer-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jordan@example.com"
            disabled={state === 'processing'}
            className="rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
          />
        </div>
        <button
          type="submit"
          disabled={state === 'processing'}
          className="flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-70"
        >
          {state === 'processing' ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Processing...
            </>
          ) : (
            'Complete Purchase'
          )}
        </button>
      </form>
    </div>
  )
}
