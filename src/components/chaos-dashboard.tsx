'use client'

import { useEffect, useRef, useState } from 'react'
import { Flame, RotateCcw, ShieldCheck, Ticket, Users, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChaosStats {
  buyers: number
  retries: number
  sold: number
  oversell: number
}

const TOTAL_SEATS = 500

const initialStats: ChaosStats = { buyers: 0, retries: 0, sold: 0, oversell: 0 }

export function ChaosDashboard() {
  const [running, setRunning] = useState(false)
  const [stats, setStats] = useState<ChaosStats>(initialStats)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const soldOut = stats.sold >= TOTAL_SEATS

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  useEffect(() => {
    if (soldOut && intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
      setRunning(false)
    }
  }, [soldOut])

  function launchChaos() {
    if (running) return
    setStats(initialStats)
    setRunning(true)
    intervalRef.current = setInterval(() => {
      setStats((prev) => {
        const newBuyers = Math.floor(Math.random() * 120) + 40
        const newRetries = Math.floor(Math.random() * 35) + 5
        const newSold = Math.min(
          TOTAL_SEATS - prev.sold,
          Math.floor(Math.random() * 18) + 4,
        )
        return {
          buyers: prev.buyers + newBuyers,
          retries: prev.retries + newRetries,
          sold: prev.sold + newSold,
          oversell: 0,
        }
      })
    }, 150)
  }

  function reset() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setRunning(false)
    setStats(initialStats)
  }

  return (
    <div className="flex flex-col items-center gap-10">
      {/* Launch button */}
      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={launchChaos}
          disabled={running}
          className={cn(
            'group relative flex items-center gap-3 rounded-2xl px-10 py-6 text-2xl font-black uppercase tracking-wide transition-all',
            running
              ? 'cursor-not-allowed bg-primary/20 text-primary'
              : 'bg-primary text-primary-foreground shadow-[0_0_40px_-8px_var(--primary)] hover:scale-105 hover:shadow-[0_0_60px_-4px_var(--primary)] active:scale-95',
          )}
        >
          <Flame
            className={cn('size-8', running && 'animate-pulse')}
            aria-hidden="true"
          />
          {running ? 'Chaos Running...' : soldOut ? 'Relaunch Chaos' : 'Launch Chaos'}
        </button>
        <div className="flex items-center gap-3">
          {running && (
            <span className="flex items-center gap-2 text-sm text-primary">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              Simulating concurrent buyers
            </span>
          )}
          {soldOut && !running && (
            <span className="flex items-center gap-2 text-sm font-semibold text-primary">
              <ShieldCheck className="size-4" aria-hidden="true" />
              Sold out. Zero oversells.
            </span>
          )}
          {(stats.buyers > 0 || soldOut) && (
            <button
              type="button"
              onClick={reset}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Counters */}
      <dl className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Users className="size-5" aria-hidden="true" />}
          label="Buyers simulated"
          value={stats.buyers}
          active={running}
        />
        <StatCard
          icon={<Zap className="size-5" aria-hidden="true" />}
          label="OCC retries"
          value={stats.retries}
          active={running}
        />
        <StatCard
          icon={<Ticket className="size-5" aria-hidden="true" />}
          label="Seats sold"
          value={stats.sold}
          suffix={` / ${TOTAL_SEATS}`}
          active={running}
        />
        <StatCard
          icon={<ShieldCheck className="size-5" aria-hidden="true" />}
          label="Oversell count"
          value={stats.oversell}
          highlight
          active={running}
        />
      </dl>

      {/* Sold progress */}
      <div className="flex w-full max-w-2xl flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Inventory</span>
          <span className="font-mono">
            {Math.round((stats.sold / TOTAL_SEATS) * 100)}% sold
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={stats.sold}
          aria-valuemin={0}
          aria-valuemax={TOTAL_SEATS}
          aria-label="Seats sold"
          className="h-2 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-150"
            style={{ width: `${(stats.sold / TOTAL_SEATS) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: number
  suffix?: string
  highlight?: boolean
  active?: boolean
}

function StatCard({ icon, label, value, suffix, highlight, active }: StatCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-2xl border bg-card p-5 transition-colors',
        highlight ? 'border-primary/50 bg-primary/5' : 'border-border',
        active && 'border-primary/30',
      )}
    >
      <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span className={cn(highlight ? 'text-primary' : 'text-muted-foreground')}>
          {icon}
        </span>
        {label}
      </dt>
      <dd
        className={cn(
          'font-mono text-4xl font-bold tabular-nums',
          highlight ? 'text-primary' : 'text-foreground',
        )}
      >
        {value.toLocaleString()}
        {suffix && (
          <span className="text-base font-medium text-muted-foreground">{suffix}</span>
        )}
      </dd>
    </div>
  )
}
