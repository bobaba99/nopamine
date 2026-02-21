-- ============================================================
-- verdict_alternatives: tracks user-accepted alternative solutions
-- ============================================================

create table verdict_alternatives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  verdict_id uuid references verdicts(id) on delete cascade,
  alternative_type text not null check (alternative_type in ('budget', 'emotional')),
  suggestion_text text not null,          -- the alternative solution text from LLM
  emotional_pattern text,                 -- Branch B: stress_relief, status_seeking, boredom, retail_therapy, etc.
  reframe_text text,                      -- Branch B: money reframing ("if you invest $X at 5%...")
  accepted_at timestamp,                  -- null = offered but not yet accepted
  created_at timestamp default now(),
  unique(verdict_id)                      -- one alternative per verdict
);

-- ============================================================
-- Extend swipe_schedules and swipes to support alternatives
-- ============================================================

-- purchase_id is already nullable in the original DDL.
-- Add alternative_id as a second possible swipe target.

alter table swipe_schedules
  add column alternative_id uuid references verdict_alternatives(id) on delete cascade;

alter table swipes
  add column alternative_id uuid references verdict_alternatives(id) on delete cascade;

-- XOR constraint: every schedule/swipe must target exactly one of purchase or alternative
alter table swipe_schedules add constraint chk_swipe_schedule_target check (
  num_nonnulls(purchase_id, alternative_id) = 1
);

alter table swipes add constraint chk_swipe_target check (
  num_nonnulls(purchase_id, alternative_id) = 1
);

-- Unique scheduling per alternative + timing (mirrors existing purchase unique constraint)
create unique index idx_swipe_schedules_alternative
  on swipe_schedules(user_id, alternative_id, timing)
  where alternative_id is not null;

create unique index idx_swipes_alternative
  on swipes(user_id, alternative_id, timing)
  where alternative_id is not null;

-- ============================================================
-- RLS policies for verdict_alternatives
-- ============================================================

alter table verdict_alternatives enable row level security;

create policy "verdict_alternatives_select_own"
  on verdict_alternatives
  for select
  using ((select auth.uid()) = user_id);

create policy "verdict_alternatives_insert_own"
  on verdict_alternatives
  for insert
  with check ((select auth.uid()) = user_id);

create policy "verdict_alternatives_update_own"
  on verdict_alternatives
  for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "verdict_alternatives_delete_own"
  on verdict_alternatives
  for delete
  using ((select auth.uid()) = user_id);

-- ============================================================
-- accept_alternative RPC
-- Inserts a verdict_alternatives row and schedules day3/week3/month3 swipes
-- ============================================================

create or replace function accept_alternative(
  p_verdict_id uuid,
  p_alternative_type text,
  p_suggestion_text text,
  p_emotional_pattern text default null,
  p_reframe_text text default null
)
returns verdict_alternatives
language plpgsql
security invoker
as $$
declare
  new_row verdict_alternatives;
  v_now timestamp := now();
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Validate alternative_type
  if p_alternative_type not in ('budget', 'emotional') then
    raise exception 'Invalid alternative_type: must be budget or emotional';
  end if;

  -- Verify verdict belongs to user
  if not exists (
    select 1 from verdicts where id = p_verdict_id and user_id = auth.uid()
  ) then
    raise exception 'Verdict not found or not owned by user';
  end if;

  -- Insert the alternative record
  insert into verdict_alternatives (
    user_id,
    verdict_id,
    alternative_type,
    suggestion_text,
    emotional_pattern,
    reframe_text,
    accepted_at
  )
  values (
    auth.uid(),
    p_verdict_id,
    p_alternative_type,
    p_suggestion_text,
    p_emotional_pattern,
    p_reframe_text,
    v_now
  )
  on conflict (verdict_id) do update set
    accepted_at = v_now
  returning * into new_row;

  -- Schedule day3, week3, month3 swipes (same cadence as purchased items)
  insert into swipe_schedules (user_id, alternative_id, timing, scheduled_for)
  values
    (auth.uid(), new_row.id, 'day3'::swipe_timing,  v_now + interval '3 days'),
    (auth.uid(), new_row.id, 'week3'::swipe_timing,  v_now + interval '3 weeks'),
    (auth.uid(), new_row.id, 'month3'::swipe_timing, v_now + interval '3 months')
  on conflict (user_id, alternative_id, timing) do update
    set scheduled_for = excluded.scheduled_for
    where swipe_schedules.completed_at is null;

  return new_row;
end;
$$;

-- ============================================================
-- Indexes for verdict_alternatives
-- ============================================================

-- LLM context retrieval: recent alternatives for a user
create index idx_verdict_alternatives_user
  on verdict_alternatives(user_id, created_at desc);

-- Branch B memory queries: emotional pattern lookup
create index idx_verdict_alternatives_type
  on verdict_alternatives(user_id, alternative_type)
  where accepted_at is not null;
