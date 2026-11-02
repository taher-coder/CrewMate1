import { CustomerNav } from "@/components/CustomerNav";

export default function HelpPage() {
  return (
    <main className="min-h-screen bg-sage pb-24">
      <header className="px-5 pb-4 pt-8">
        <h1 className="text-xl font-bold text-charcoal">Help &amp; support</h1>
      </header>
      <section className="px-5">
        <div className="rounded-2xl bg-warm-white p-5 text-sm text-muted shadow-sm">
          Support ticketing isn&apos;t wired up yet — it reads from{" "}
          <code className="rounded bg-sage px-1.5 py-0.5 text-xs">
            support_tickets
          </code>{" "}
          once built. For now, this is a placeholder.
        </div>
      </section>
      <CustomerNav />
    </main>
  );
}
