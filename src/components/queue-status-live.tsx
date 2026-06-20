'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Hourglass, Users, CheckCircle } from 'lucide-react'

interface Props {
  eventId: string
  eventName: string
}

function getSession(): string {
  if (typeof window === 'undefined') return ''
  let session = sessionStorage.getItem('encore-session')
  if (!session) {
    session = `session-${crypto.randomUUID()}`
    sessionStorage.setItem('encore-session', session)
  }
  return session
}

export function QueueStatusLive({ eventId, eventName }: Props) {
  const router = useRouter()
  const [position, setPosition] = useState<number | null>(null)
  const [initialPosition, setInitialPosition] = useState<number>(0)
  const [admitted, setAdmitted] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(0)
  const [loading, setLoading] = useState(true)

  // Join queue on mount
  const joinQueue = useCallback(async () => {
    if (!eventId) return
    const session = getSession()

    try {
      const res = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, userSession: session }),
      })
      const data = await res.json()
      setPosition(data.position)
      setInitialPosition(data.position)
      setLoading(false)
    } catch {
      setLoading(false)
    }
  }, [eventId])

  // Poll for position updates every 3 seconds
  const pollPosition = useCallback(async () => {
    if (!eventId) return
    const session = getSession()

    try {
      const res = await fetch(
        `/api/queue?eventId=${eventId}&session=${session}`
      )
      const data = await res.json()

      if (data.admitted) {
        setAdmitted(true)
      } else if (data.position !== null) {
        setPosition(data.position)
        setLastUpdated(0)
      }
    } catch { /* ignore */ }
  }, [eventId])

  useEffect(() => {
    joinQueue()
  }, [joinQueue])

  useEffect(() => {
    if (admitted) {
      const redirect = setTimeout(() => router.push('/'), 2000)
      return () => clearTimeout(redirect)
    }

    const interval = setInterval(() => {
      pollPosition()
    }, 3000)

    return () => clearInterval(interval)
  }, [admitted, pollPosition, router])

  // Tick "updated Xs ago"
  useEffect(() => {
    const tick = setInterval(() => setLastUpdated((prev) => prev + 1), 1000)
    return () => clearInterval(tick)
  }, [])

  const progress = initialPosition > 0
    ? Math.min(100, ((initialPosition - (position ?? initialPosition)) / initialPosition) * 100)
    : 0

  // Admitted state
  if (admitted) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <CheckCircle className="size-16 text-primary animate-bounce" />
        <p className="text-3xl font-bold text-primary">You&apos;re in!</p>
        <p className="text-muted-foreground">Taking you to the seat map...</p>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4">
        <Hourglass className="size-8 animate-pulse text-primary" />
        <p className="text-muted-foreground text-sm">Joining queue...</p>
      </div>
    )
  }

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-8">

      {/* Position number */}
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex size-16 items-center justify-center rounded-full border border-primary/40 bg-primary/10">
          <Hourglass className="size-7 animate-pulse text-primary" aria-hidden="true" />
        </span>
        <p
          aria-live="polite"
          className="font-mono text-6xl font-black tabular-nums text-primary md:text-7xl"
        >
          #{(position ?? 0).toLocaleString()}
        </p>
        <p className="text-balance text-lg text-muted-foreground">
          You&apos;re #{(position ?? 0).toLocaleString()} in line for{' '}
          <span className="text-foreground font-medium">{eventName}</span>
        </p>
      </div>

      {/* Progress bar */}
      <div className="flex w-full flex-col gap-2">
        <div
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Queue progress"
          className="relative h-3 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-primary/20 to-transparent"
          />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Users className="size-3.5" aria-hidden="true" />
            {Math.round(progress)}% of the way there
          </span>
          <span className="font-mono">updated {lastUpdated}s ago</span>
        </div>
      </div>

      {/* Queue powered by DynamoDB callout */}
      <div className="w-full rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-center">
        <p className="text-xs text-muted-foreground">
          Queue position stored in{' '}
          <span className="font-medium text-primary">Amazon DynamoDB</span>
          {' '}· TTL auto-expires after 30 min · Fair ordering guaranteed
        </p>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Your place is saved automatically. Don&apos;t close this tab.
      </p>
    </div>
  )
}
