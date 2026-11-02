# CrewMate

A home-services marketplace app (plumbing, electrical, AC repair — Urban Company style),
built as a real Next.js 16 + Supabase application with four role-based experiences:

- **Customer** — book a service, track job progress, message the company/worker, cancel, review.
- **Company** — review incoming requests, accept/reject offers, assign workers, manage services/earnings/reviews/support.
- **Worker** — see assigned jobs, advance job status, toggle availability.
- **Admin** (`/internal-access`) — approve/reject company applications, moderate reviews, manage support tickets, suspend companies/workers, view analytics and audit logs.

All business logic — state machines, matching/dispatch, authorization — lives in
Postgres (RLS policies, triggers, and `SECURITY DEFINER` RPCs) on the Supabase
project this app is wired to. The Next.js app is a thin, role-gated UI over that.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev
```

### Environment variables

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Safe to expose to the browser. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Safe to expose to the browser — RLS enforces access. |
| `GOOGLE_MAPS_API_KEY` | no | Server-side only. Enables real address geocoding; falls back to a placeholder Ahmedabad point when unset. Needs the Geocoding API enabled in Google Cloud Console. |

## Becoming a company or an admin

- **Company**: any signed-in customer can apply from Profile → "Become a CrewMate partner" (`/become-a-partner`). An admin then approves the application from `/internal-access/companies`, which automatically promotes the applicant to `company_owner`.
- **Worker**: invite-only — a company invites a worker by email from `/company/workers`; the invite is accepted on first sign-in.
- **Admin**: there is no self-serve path by design. The first admin has to be promoted directly in the database (`update profiles set role = 'admin' where id = '<their-auth-user-id>'`) after they've signed in once via email OTP.

## Deploying

Import this repo into [Vercel](https://vercel.com/new), set the environment
variables above in the project settings, and deploy. The app has no build-time
dependency on the database beyond the generated `src/lib/supabase/database.types.ts`,
which is checked in and only needs regenerating after a schema change.

## Schema

The live schema (tables, RLS policies, triggers, RPCs) is managed directly on
the Supabase project via its migration history — `supabase/migrations/` here
only reflects the project's original scaffold and is not a complete snapshot
of the current schema. Treat the Supabase project itself as the source of
truth.
