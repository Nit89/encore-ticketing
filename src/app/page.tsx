import { CalendarDays, MapPin, Ticket } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SeatMap } from '@/components/seat-map'

interface EventDetails {
  name: string
  tagline: string
  date: string
  venue: string
  city: string
}

const event: EventDetails = {
  name: 'Midnight Frequency',
  tagline: 'One night only. 500 seats. Zero oversells.',
  date: 'Saturday, July 18, 2026 — 9:00 PM',
  venue: 'The Volt Arena',
  city: 'Brooklyn, NY',
}

export default function EventPage() {
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
          <p className="text-pretty text-lg text-muted-foreground">{event.tagline}</p>
          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground sm:flex-row sm:gap-6">
            <span className="flex items-center gap-2">
              <CalendarDays className="size-4 text-primary" aria-hidden="true" />
              {event.date}
            </span>
            <span className="flex items-center gap-2">
              <MapPin className="size-4 text-primary" aria-hidden="true" />
              {event.venue}, {event.city}
            </span>
          </div>
        </section>

        {/* Seat map */}
        <SeatMap rows={20} cols={25} />
      </main>
    </>
  )
}
