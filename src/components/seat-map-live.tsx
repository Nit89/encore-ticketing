'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type SeatStatus = 'available' | 'held' | 'sold' | 'unavailable'

interface LiveSeat {
  id: string
  row: string
  number: number
  section: string
  status: SeatStatus
}

interface SeatMapLiveProps {
  eventId: string
  eventName: string
  priceUsd: number
}

const statusClasses: Record<SeatStatus, string> = {
  available: 'bg-seat-available hover:scale-125 hover:shadow-[0_0_8px_var(--seat-available)] cursor-pointer',
  held: 'bg-seat-held cursor-not-allowed opacity-80',
  sold: 'bg-seat-sold cursor-not-allowed opacity-80',
  unavailable: 'bg-seat-unavailable cursor-not-allowed',
}

const legend: { status: SeatStatus; label: string }[] = [
  { status: 'available', label: 'Available' },
  { status: 'held', label: 'Held' },
  { status: 'sold', label: 'Sold' },
  { status: 'unavailable', label: 'Unavailable' },
]

// Generate a session ID for this browser tab
function getSession(): string {
  if (typeof window === 'undefined') return ''
  let session = sessionStorage.getItem('encore-session')
  if (!session) {
    session = `session-${crypto.randomUUID()}`
    sessionStorage.setItem('encore-session', session)
  }
  return session
}

export function SeatMapLive({ eventId, eventName, priceUsd }: SeatMapLiveProps) {
  const router = useRouter()
  const [seats, setSeats] = useState<LiveSeat[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [holding, setHolding] = useState(false)
  const [stats, setStats] = useState({ soldCount: 0, heldCount: 0, availableCount: 0 })
  const [error, setError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  // Connect to SSE stream for live seat updates
  useEffect(() => {
    const url = `/api/seats/stream?eventId=${eventId}`
    const es = new EventSource(url)
    eventSourceRef.current = es

    es.onmessage = (e) => {
      const data = JSON.parse(e.data)
      setSeats(data.seats)
      setStats({
        soldCount: data.soldCount,
        heldCount: data.heldCount,
        availableCount: data.availableCount,
      })
      setLoading(false)
    }

    es.onerror = () => {
      setError('Lost connection to seat map. Retrying...')
      // EventSource auto-reconnects
    }

    return () => {
      es.close()
    }
  }, [eventId])

  const selectedSeat = seats.find((s) => s.id === selectedId) ?? null

  function handleSeatClick(seat: LiveSeat) {
    if (seat.status !== 'available') return
    setSelectedId((prev) => (prev === seat.id ? null : seat.id))
  }

  const handleHoldSeat = useCallback(async () => {
    if (!selectedSeat) return
    setHolding(true)
    setError(null)

    try {
      const res = await fetch('/api/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          seatId: selectedSeat.id,
          userSession: getSession(),
        }),
      })

      const data = await res.json()

      if (data.success) {
        // Navigate to checkout with seat + event info
        router.push(
          `/checkout?seatId=${selectedSeat.id}&eventId=${eventId}&row=${selectedSeat.row}&number=${selectedSeat.number}&section=${selectedSeat.section}&price=${priceUsd}`
        )
      } else {
        setError(data.message || 'Seat was just taken. Please choose another.')
        setSelectedId(null)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setHolding(false)
    }
  }, [selectedSeat, eventId, priceUsd, router])

  // Group seats by row for display
  const rows = seats.reduce<Record<string, LiveSeat[]>>((acc, seat) => {
    if (!acc[seat.row]) acc[seat.row] = []
    acc[seat.row].push(seat)
    return acc
  }, {})

  const rowLabels = Object.keys(rows).sort()

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Connecting to live seat map...</p>
      </div>
    )
  }

  return (
    <section aria-label="Live seat map" className="flex flex-col gap-6">

      {/* Live stats bar */}
      <div className="flex items-center justify-center gap-6 rounded-xl border border-primary/20 bg-primary/5 px-6 py-3">
        <div className="text-center">
          <p className="font-mono text-2xl font-bold text-green-400">{stats.availableCount}</p>
          <p className="text-xs text-muted-foreground">Available</p>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="text-center">
          <p className="font-mono text-2xl font-bold text-yellow-400">{stats.heldCount}</p>
          <p className="text-xs text-muted-foreground">Held</p>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="text-center">
          <p className="font-mono text-2xl font-bold text-red-400">{stats.soldCount}</p>
          <p className="text-xs text-muted-foreground">Sold</p>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="text-center">
          <p className="font-mono text-2xl font-bold text-primary">0</p>
          <p className="text-xs text-muted-foreground">Oversells</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <ul className="flex flex-wrap items-center gap-4">
          {legend.map((item) => (
            <li key={item.status} className="flex items-center gap-2">
              <span
                className={cn('size-3 rounded-sm', statusClasses[item.status].split(' ')[0])}
                aria-hidden="true"
              />
              <span className="text-sm text-muted-foreground">{item.label}</span>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <span className="size-2 animate-pulse rounded-full bg-green-400" />
          <span className="text-xs text-muted-foreground">Live</span>
        </div>
      </div>

      {/* Stage */}
      <div className="flex flex-col items-center gap-1">
        <div className="h-2 w-3/4 rounded-full bg-primary/30 blur-sm" aria-hidden="true" />
        <div className="w-2/3 rounded-b-xl border border-t-0 border-primary/40 bg-primary/5 py-2 text-center text-xs font-semibold tracking-[0.3em] text-primary">
          STAGE
        </div>
      </div>

      {/* Seat grid — grouped by row */}
      <div className="overflow-x-auto pb-2">
        <div className="mx-auto w-fit">
          {rowLabels.map((rowLabel) => (
            <div key={rowLabel} className="mb-1 flex items-center gap-2">
              <span className="w-5 text-right font-mono text-xs text-muted-foreground">
                {rowLabel}
              </span>
              <div className="flex gap-1">
                {rows[rowLabel]
                  .sort((a, b) => a.number - b.number)
                  .map((seat) => {
                    const isSelected = seat.id === selectedId
                    return (
                      <button
                        key={seat.id}
                        type="button"
                        aria-label={`Row ${seat.row} Seat ${seat.number} — ${seat.section} — ${seat.status}${isSelected ? ' — selected' : ''}`}
                        aria-pressed={isSelected}
                        disabled={seat.status !== 'available'}
                        onClick={() => handleSeatClick(seat)}
                        className={cn(
                          'size-4 rounded-[3px] transition-all duration-100 sm:size-5',
                          statusClasses[seat.status],
                          isSelected && 'scale-125 ring-2 ring-primary ring-offset-2 ring-offset-background',
                        )}
                      />
                    )
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-center text-sm text-red-400">{error}</p>
      )}

      {/* Selection panel */}
      <div
        className={cn(
          'mx-auto flex w-full max-w-md items-center justify-between rounded-xl border bg-card p-4 transition-opacity',
          selectedSeat ? 'border-primary/40 opacity-100' : 'opacity-60',
        )}
      >
        {selectedSeat ? (
          <>
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Selected
              </span>
              <span className="font-mono text-2xl font-bold text-primary">
                Row {selectedSeat.row} · Seat {selectedSeat.number}
              </span>
              <span className="text-xs text-muted-foreground">
                {selectedSeat.section} · ${priceUsd}
              </span>
            </div>
            <button
              type="button"
              onClick={handleHoldSeat}
              disabled={holding}
              className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
            >
              {holding ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Lock className="size-4" aria-hidden="true" />
              )}
              {holding ? 'Holding...' : 'Hold Seat'}
            </button>
          </>
        ) : (
          <p className="w-full text-center text-sm text-muted-foreground">
            Click an available seat to select it
          </p>
        )}
      </div>
    </section>
  )
}
