-- ============================================================================
-- CrewMate — Auto-create profile on signup (Migration 0008)
--
-- Gap found while setting up a real test login: nothing was creating a
-- public.profiles row when a new auth.users row appeared (via OTP, Google,
-- or any other provider). Every downstream FK (company_members.profile_id,
-- requests.customer_id, etc.) points at profiles(id), not auth.users(id)
-- directly — so without this trigger, a brand new user hits a foreign-key
-- violation the first time they try to do ANYTHING (e.g. apply as a
-- company), even though login itself "succeeds". Sec 5.1: new sign-ups
-- default to the 'customer' role; nobody self-selects a role at signup.
-- ============================================================================

create or replace function handle_new_auth_user()
returns trigger as $$
begin
  insert into public.profiles (id, role, full_name, phone, email)
  values (
    new.id,
    'customer',
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.phone,
    new.email
  )
  on conflict (id) do nothing; -- idempotent, in case something else already created it
  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();
