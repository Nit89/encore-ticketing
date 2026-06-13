import { SiteHeader } from '@/components/site-header'
import { ChaosDashboard } from '@/components/chaos-dashboard'

export default function ChaosPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-12">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="rounded-full border border-destructive/40 bg-destructive/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-destructive">
            Load Simulation
          </span>
          <h1 className="text-balance text-4xl font-black uppercase tracking-tight md:text-5xl">
            Chaos Mode
          </h1>
          <p className="max-w-xl text-pretty text-muted-foreground">
            Unleash thousands of simulated buyers against the inventory at once.
            Optimistic concurrency control keeps every seat honest — watch the
            oversell counter stay at zero.
          </p>
        </div>
        <ChaosDashboard />
      </main>
    </>
  )
}
