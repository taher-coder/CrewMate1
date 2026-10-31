// Browser-side Supabase client — used in Client Components ("use client").
// Respects RLS as the signed-in user; never has elevated privileges.
//
// NOTE: not parameterized with a hand-written Database generic. Supabase's
// typed-client generics are strict about the generated shape (Relationships,
// etc.) and a hand-rolled type produced "never" inference errors. Once this
// is linked to a real Supabase project, run:
//   supabase gen types typescript --linked > src/lib/types/database.generated.ts
// and switch this to createBrowserClient<Database>(...) using the generated
// file instead of src/lib/types/database.ts (which stays as human-readable
// reference / for manual casts in the meantime).
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
