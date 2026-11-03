import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Two different sign-in flows land here with two different shapes:
 *  - Email OTP links carry `token_hash` + `type` -> verifyOtp().
 *  - OAuth (Google) redirects carry a PKCE `code` -> exchangeCodeForSession().
 * Both end the same way: a session cookie, then on to /onboarding (which
 * sends the user to their role's home once a profile exists).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/onboarding";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as "email",
      token_hash,
    });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=link_invalid`);
}
