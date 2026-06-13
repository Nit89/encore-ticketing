'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SeatStatus = 'available' | 'held' | 'sold' | 'unavailable'

export interface Seat {
  id: string
  row: number
  col: number
  status: SeatStatus
}

interface SeatMapProps {
  rows: number
  cols: number
  /** Seed for the deterministic initial seat layout */
  seed?: number
}

/** Deterministic PRNG so server + client render the same layout */
function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function rowLabel(row: number) {
  // A, B, ... Z, AA, AB ...
  let label = ''
  let n = row
  do {
    label = String.fromCharCode(65 + (n % 26)) + label
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return label
}

function buildSeats(rows: number, cols: number, seed: number): Seat[] {
  const rand = mulberry32(seed)
  const seats: Seat[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const roll = rand()
      let status: SeatStatus
      if (roll < 0.08) status = 'unavailable'
      else if (roll < 0.3) status = 'sold'
      else if (roll < 0.42) status = 'held'
      else status = 'available'
      seats.push({ id: `${rowLabel(r)}${c + 1}`, row: r, col: c, status })
    }
  }
  return seats
}

const statusClasses: Record<SeatStatus, string> = {
  available:
    'bg-seat-available hover:scale-125 hover:shadow-[0_0_8px_var(--seat-available)] cursor-pointer',
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

export function SeatMap({ rows, cols, seed = 42 }: SeatMapProps) {
  const router = useRouter()
  const initialSeats = useMemo(() => buildSeats(rows, cols, seed), [rows, cols, seed])
  const [seats, setSeats] = useState<Seat[]>(initialSeats)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selectedSeat = seats.find((s) => s.id === selectedId) ?? null
  const availableCount = seats.filter((s) => s.status === 'available').length

  function handleSeatClick(seat: Seat) {
    if (seat.status !== 'available') return
    setSelectedId((prev) => (prev === seat.id ? null : seat.id))
  }

  function handleHoldSeat() {
    if (!selectedSeat) return
    setSeats((prev) =>
      prev.map((s) => (s.id === selectedSeat.id ? { ...s, status: 'held' } : s)),
    )
    router.push(`/checkout?seat=${encodeURIComponent(selectedSeat.id)}`)
  }

  return (
    <section aria-label="Seat map" className="flex flex-col gap-6">
      {/* Legend + availability */}
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
        <p className="font-mono text-sm text-primary">
          {availableCount} seats available
        </p>
      </div>

      {/* Stage */}
      <div className="flex flex-col items-center gap-1">
        <div className="h-2 w-3/4 rounded-full bg-primary/30 blur-sm" aria-hidden="true" />
        <div className="w-2/3 rounded-b-xl border border-t-0 border-primary/40 bg-primary/5 py-2 text-center text-xs font-semibold tracking-[0.3em] text-primary">
          STAGE
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto pb-2">
        <div
          role="grid"
          aria-label={`Seat map with ${rows} rows and ${cols} seats per row`}
          className="mx-auto grid w-fit gap-1"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {seats.map((seat) => {
            const isSelected = seat.id === selectedId
            return (
              <button
                key={seat.id}
                type="button"
                role="gridcell"
                aria-label={`Seat ${seat.id}, ${seat.status}${isSelected ? ', selected' : ''}`}
                aria-pressed={isSelected}
                disabled={seat.status !== 'available'}
                onClick={() => handleSeatClick(seat)}
                className={cn(
                  'size-4 rounded-[3px] transition-all duration-100 sm:size-5',
                  statusClasses[seat.status],
                  isSelected &&
                    'scale-125 ring-2 ring-primary ring-offset-2 ring-offset-background',
                )}
              />
            )
          })}
        </div>
      </div>

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
                Selected seat
              </span>
              <span className="font-mono text-2xl font-bold text-primary">
                {selectedSeat.id}
              </span>
            </div>
            <button
              type="button"
              onClick={handleHoldSeat}
              className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105 active:scale-95"
            >
              <Lock className="size-4" aria-hidden="true" />
              Hold Seat
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
