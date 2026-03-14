-- Allow anonymous users (NULL email) to have a public.users row.
-- The base migration now defines email as nullable, so the NOT NULL drop
-- is a no-op safety net for incremental push.

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

-- Safety net: ensure email is nullable (base migration already handles this).
alter table public.users alter column email drop not null;
