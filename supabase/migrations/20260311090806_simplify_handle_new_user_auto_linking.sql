-- Simplify handle_new_user() now that Supabase automatic identity linking is
-- active (enabled by default). When a user signs in with Google and later with
-- Apple using the same verified email, GoTrue merges both identities under a
-- single auth.users UUID — so the trigger never sees a UUID conflict.
--
-- The ON CONFLICT (id) upsert handles all cases:
--   - Same user returning -> id matches, update email + last_active.
--   - Anonymous user (null email) -> inserted with null email so FK refs work.
--   - Anonymous → permanent conversion -> id matches, email updated.
--
-- If a UNIQUE(email) violation somehow occurs (e.g. manual user recreation in
-- Dashboard), the trigger lets it propagate so the root cause is visible in
-- logs rather than silently reassigning the PK (which would orphan FK refs).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, created_at, last_active)
  values (
    new.id,
    new.email,
    now(),
    now()
  )
  on conflict (id) do update set
    email = coalesce(excluded.email, public.users.email),
    last_active = now();

  return new;
end;
$$;
