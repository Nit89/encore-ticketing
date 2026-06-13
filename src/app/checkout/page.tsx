import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { CheckoutForm } from '@/components/checkout-form'

interface CheckoutPageProps {
  searchParams: Promise<{ seat?: string }>
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const { seat } = await searchParams

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex max-w-xl flex-col gap-8 px-4 py-12">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-balance text-3xl font-bold tracking-tight">Checkout</h1>
          <p className="text-sm text-muted-foreground">
            Complete your purchase before the hold expires.
          </p>
        </div>

        {seat ? (
          <CheckoutForm seatId={seat} />
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center">
            <p className="text-pretty text-muted-foreground">
              No seat selected yet. Head to the seat map and hold a seat first.
            </p>
            <Link
              href="/"
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105 active:scale-95"
            >
              Pick a seat
            </Link>
          </div>
        )}
      </main>
    </>
  )
}
