import { CalendarDays, MapPin, Ticket } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SeatMapLive } from '@/components/seat-map-live'
import { getEvents } from '@/lib/dsql'

export const dynamic = 'force-dynamic'

export default async function EventPage() {
  // Fetch real events from Aurora DSQL
  const events = await getEvents()
  const event = events[0] // Use first event (Taylor Swift)

  if (!event) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10">
          <p className="text-center text-muted-foreground">No events found. Run npm run seed first.</p>
        </main>
      </>
    )
  }

  const eventDate = new Date(event.event_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10">
        {/* Event hero */}
        <section className="flex flex-col items-center gap-4 text-center">
          <span className="flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
            <Ticket className="size-3.5" aria-hidden="true" />
            Flash Sale Live
          </span>
          <h1 className="text-balance text-4xl font-bold tracking-tight md:text-6xl">
            {event.name}
          </h1>
          <p className="text-pretty text-lg text-muted-foreground">
            {event.available_seats} seats remaining · ${event.price_usd} per seat
          </p>
          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground sm:flex-row sm:gap-6">
            <span className="flex items-center gap-2">
              <CalendarDays className="size-4 text-primary" aria-hidden="true" />
              {eventDate}
            </span>
            <span className="flex items-center gap-2">
              <MapPin className="size-4 text-primary" aria-hidden="true" />
              {event.venue}
            </span>
          </div>
        </section>

        {/* Live seat map — connected to real APIs */}
        <SeatMapLive
          eventId={event.id}
          eventName={event.name}
          priceUsd={Number(event.price_usd)}
        />
      </main>
    </>
  )
}
