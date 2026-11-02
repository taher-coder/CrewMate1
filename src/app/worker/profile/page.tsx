import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";

export default async function WorkerProfilePage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { data: worker } = await supabase
    .from("workers")
    .select("full_name, status, rating_avg, rating_count, companies(display_name, legal_name)")
    .eq("profile_id", userData.user!.id)
    .single();

  return (
    <main className="px-5 pb-4 pt-8">
      <h1 className="mb-5 text-lg font-bold text-charcoal">My profile</h1>
      <div className="rounded-2xl bg-warm-white p-5 shadow-sm">
        <Row label="Name" value={worker?.full_name ?? "—"} />
        <Row
          label="Company"
          value={worker?.companies?.display_name ?? worker?.companies?.legal_name ?? "—"}
        />
        <Row label="Status" value={worker?.status ?? "—"} />
        <Row
          label="Rating"
          value={worker?.rating_avg ? `★ ${worker.rating_avg.toFixed(1)} (${worker.rating_count})` : "No ratings yet"}
        />
      </div>
      <form action={signOut} className="mt-4">
        <button className="w-full rounded-xl border border-black/10 bg-warm-white py-3 text-sm font-semibold text-danger">
          Sign out
        </button>
      </form>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-black/5 py-2.5 text-sm last:border-0">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-charcoal">{value}</span>
    </div>
  );
}
