import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Runs on every request:
 *  1. Refreshes the Supabase session (required for SSR auth to keep working).
 *  2. Enforces the role boundary between the four experiences. This is a
 *     UX convenience (fast redirect) — the REAL enforcement is Postgres RLS.
 *     Never treat this middleware check as the security boundary.
 */

const ROLE_HOME: Record<string, string> = {
  customer: "/",
  company_owner: "/company",
  company_staff: "/company",
  worker: "/worker",
  admin: "/internal-access",
};

/**
 * Set APP_SCOPE on a deployment (plain env var — middleware runs
 * server-side, so it doesn't need NEXT_PUBLIC_) to turn this same codebase
 * into a single-purpose app for one role, e.g. a separate Vercel project
 * at its own URL for companies only. Unset (the default/main deployment)
 * serves all four roles as before. Admins can always sign in anywhere,
 * since they may need to check any of the apps.
 */
const SCOPE_ROLES: Record<string, string[]> = {
  customer: ["customer"],
  company: ["company_owner", "company_staff"],
  worker: ["worker"],
};

function currentScope(): string | null {
  const scope = process.env.APP_SCOPE;
  return scope && SCOPE_ROLES[scope] ? scope : null;
}

function roleAllowedForPath(role: string, pathname: string) {
  if (pathname.startsWith("/company")) {
    return role === "company_owner" || role === "company_staff";
  }
  if (pathname.startsWith("/worker")) {
    return role === "worker";
  }
  if (pathname.startsWith("/internal-access")) {
    return role === "admin";
  }
  // Shared job-conversation page: reachable by any role. Authorization for
  // a *specific* job is enforced by get_or_create_job_conversation() itself
  // (and by RLS on messages/conversations), not by this middleware.
  if (pathname.startsWith("/jobs/")) {
    return true;
  }
  // Root customer experience: anything not under the role-prefixed paths
  // and not an auth/public route.
  return role === "customer";
}

const PUBLIC_PATHS = ["/login", "/signup", "/auth", "/_next", "/favicon.ico"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: userData } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) return response;

  if (!userData.user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (!profile) {
    // Authenticated in Supabase Auth but no profile row yet — send to
    // onboarding rather than letting them hit a role-gated page.
    const url = request.nextUrl.clone();
    url.pathname = "/onboarding";
    return NextResponse.redirect(url);
  }

  const scope = currentScope();
  if (scope && profile.role !== "admin" && !SCOPE_ROLES[scope].includes(profile.role)) {
    // This deployment is scoped to one role (e.g. the company-only URL) —
    // a customer or worker signing in here doesn't belong, regardless of
    // which path they hit. Sign them out and send them back to /login with
    // an explanation, rather than silently showing them their normal app
    // on what's supposed to be a single-purpose URL.
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("error", "wrong_portal");
    return NextResponse.redirect(url);
  }

  if (!roleAllowedForPath(profile.role, pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = ROLE_HOME[profile.role] ?? "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
