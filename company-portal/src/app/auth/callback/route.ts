import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// OAuth (Google) redirect target. Exchanges the code for a session, then
// sends the user into the app — the root page decides apply/pending/dashboard.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}/`);
}
