// Server-side Supabase client — used in Server Components, Server Actions,
// and Route Handlers. Still runs AS the signed-in user (anon key + their
// session cookie), so RLS still applies. This is NOT a service-role client.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// See client.ts for why this isn't parameterized with a Database generic yet.

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — middleware refreshes the
            // session instead. Safe to ignore here.
          }
        },
      },
    }
  );
}
