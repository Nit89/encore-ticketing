import { SiteHeader } from '@/components/site-header'
import { QueueStatusLive } from '@/components/queue-status-live'
import { getEvents } from '@/lib/dsql'

export const dynamic = 'force-dynamic'

export default async function WaitingRoomPage() {
  const events = await getEvents()
  const event = events[0]

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-3xl flex-col items-center justify-center gap-10 px-4 py-12">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
            High Demand
          </span>
          <h1 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">
            You&apos;re in the waiting room
          </h1>
          <p className="max-w-md text-pretty text-muted-foreground">
            Demand for <strong className="text-foreground">{event?.name ?? 'this event'}</strong> is
            off the charts. Hang tight — we&apos;ll let you in the moment a spot opens up.
          </p>
        </div>

        <QueueStatusLive
          eventId={event?.id ?? ''}
          eventName={event?.name ?? ''}
        />
      </main>
    </>
  )
}
