-- Minimal stand-in for the parts of Supabase our migrations assume exist:
-- the auth schema, auth.users, auth.uid(), and the authenticated/service_role roles.
-- This file is ONLY for local validation against vanilla Postgres+PostGIS;
-- a real Supabase project already provides all of this.

create schema if not exists auth;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text
);

create or replace function auth.uid() returns uuid as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$ language sql stable;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role;
  end if;
end $$;

grant usage on schema public to authenticated, service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
