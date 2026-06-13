'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Hourglass, Users } from 'lucide-react'

interface QueueStatusProps {
  /** Starting position in the queue */
  initialPosition: number
}

export function QueueStatus({ initialPosition }: QueueStatusProps) {
  const router = useRouter()
  const [position, setPosition] = useState(initialPosition)
  const [lastUpdated, setLastUpdated] = useState(0)

  const progress = Math.min(
    100,
    ((initialPosition - position) / initialPosition) * 100,
  )
  const admitted = position <= 0

  // Auto-refresh: decrement position every few seconds like a real queue poll
  useEffect(() => {
    if (admitted) {
      const redirect = setTimeout(() => router.push('/'), 2000)
      return () => clearTimeout(redirect)
    }
    const interval = setInterval(() => {
      setPosition((prev) => Math.max(0, prev - (Math.floor(Math.random() * 90) + 30)))
      setLastUpdated(0)
    }, 3000)
    return () => clearInterval(interval)
  }, [admitted, router])

  // Tick "updated Xs ago" counter
  useEffect(() => {
    const tick = setInterval(() => setLastUpdated((prev) => prev + 1), 1000)
    return () => clearInterval(tick)
  }, [])

  if (admitted) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-3xl font-bold text-primary">You&apos;re up!</p>
        <p className="text-muted-foreground">Redirecting you to the seat map...</p>
      </div>
    )
  }

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-8">
      {/* Position */}
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex size-16 items-center justify-center rounded-full border border-primary/40 bg-primary/10">
          <Hourglass className="size-7 animate-pulse text-primary" aria-hidden="true" />
        </span>
        <p
          aria-live="polite"
          className="font-mono text-6xl font-black tabular-nums text-primary md:text-7xl"
        >
          #{position.toLocaleString()}
        </p>
        <p className="text-balance text-lg text-muted-foreground">
          You&apos;re #{position.toLocaleString()} in line
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
          {/* Animated shimmer */}
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

      <p className="text-center text-xs text-muted-foreground">
        Your place is saved automatically. This page refreshes on its own —
        don&apos;t close the tab.
      </p>
    </div>
  )
}
