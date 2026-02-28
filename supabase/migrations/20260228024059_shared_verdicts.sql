-- Shared verdicts: public snapshot for social sharing (FR-011, FR-012, FR-013)

create table shared_verdicts (
  id uuid primary key default gen_random_uuid(),
  verdict_id uuid not null references verdicts(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  share_token text unique not null,
  candidate_title text not null,
  candidate_price numeric,
  candidate_vendor text,
  candidate_category text,
  predicted_outcome text not null check (predicted_outcome in ('buy', 'hold', 'skip')),
  rationale_summary text,
  decision_score numeric,
  created_at timestamptz default now(),
  view_count integer default 0
);

create index idx_shared_verdicts_token on shared_verdicts(share_token);
create index idx_shared_verdicts_verdict_id on shared_verdicts(verdict_id);

-- RLS
alter table shared_verdicts enable row level security;

-- Anyone can read shared verdicts (public landing page)
create policy "shared_verdicts_select_public"
  on shared_verdicts for select
  using (true);

-- Only the owner can create shared verdicts
create policy "shared_verdicts_insert_own"
  on shared_verdicts for insert
  with check (auth.uid() = user_id);

-- Only the owner can update (e.g. view_count is updated via public select + rpc if needed)
create policy "shared_verdicts_update_own"
  on shared_verdicts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Only the owner can delete
create policy "shared_verdicts_delete_own"
  on shared_verdicts for delete
  using (auth.uid() = user_id);

-- Allow anonymous view count increment via RPC
create or replace function increment_share_view_count(p_token text)
returns void
language sql
security definer
as $$
  update shared_verdicts
  set view_count = view_count + 1
  where share_token = p_token;
$$;
