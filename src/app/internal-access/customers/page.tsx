import { createClient } from "@/lib/supabase/server";

export default async function AdminCustomersPage() {
  const supabase = await createClient();
  const { data: customers } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, created_at")
    .eq("role", "customer")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-charcoal">Customers</h1>
      <p className="mb-6 text-sm text-muted">
        {customers?.length ?? 0} registered customer
        {customers?.length === 1 ? "" : "s"}.
      </p>
      <div className="space-y-2">
        {customers?.map((c) => (
          <div key={c.id} className="card rounded-xl bg-warm-white p-4">
            <p className="text-sm font-semibold text-charcoal">
              {c.full_name ?? "No name on file"}
            </p>
            <p className="text-xs text-muted">
              {c.email ?? c.phone ?? "No contact on file"} · joined{" "}
              {new Date(c.created_at).toLocaleDateString("en-IN", {
                dateStyle: "medium",
              })}
            </p>
          </div>
        ))}
        {!customers?.length && (
          <p className="text-sm text-muted">No customers yet.</p>
        )}
      </div>
    </div>
  );
}
