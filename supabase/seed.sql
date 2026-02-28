-- Seed data for local development and testing
-- Run with: supabase db reset (which applies migrations then seed.sql)

-- Test user ID (use a fixed UUID so it can be referenced)

-- Temporarily disable RLS for seeding
alter table users disable row level security;
alter table purchases disable row level security;
alter table user_values disable row level security;
alter table swipe_schedules disable row level security;
alter table swipes disable row level security;
alter table verdicts disable row level security;

-- Seed test data only for an existing Supabase Auth user.
do $$
declare
  test_user_id uuid;
  target_email text := 'gavingengzihao@gmail.com';
begin
  -- Clean up orphaned profile rows that are not backed by auth.users.
  delete from public.users u
  where u.email = target_email
    and not exists (
      select 1
      from auth.users a
      where a.id = u.id
    );

  -- Match by email in auth.users only.
  select id into test_user_id from auth.users where email = target_email;
  if test_user_id is not null then
    insert into public.users (
      id,
      email,
      onboarding_completed,
      profile_summary,
      weekly_fun_budget,
      onboarding_answers
    )
    values (
      test_user_id,
      target_email,
      true,
      'Focused on financial stability and durability, cautious about impulse buys.',
      200.00,
      jsonb_build_object(
        'coreValues', jsonb_build_array(
          'Financial stability',
          'Minimalism / low clutter',
          'Emotional wellbeing',
          'Self-improvement',
          'Aesthetic enjoyment',
          'Convenience'
        ),
        'regretPatterns', jsonb_build_array(
          'It didn''t get used',
          'It was too expensive for what it gave',
          'It was driven by stress, boredom, or FOMO',
          'It duplicated something I already had'
        ),
        'satisfactionPatterns', jsonb_build_array(
          'Lasts a long time',
          'Improves my daily routine',
          'Supports my growth or habits',
          'Saves time or energy',
          'Makes life calmer or easier'
        ),
        'decisionStyle', 'I plan carefully and delay',
        'neuroticismScore', 3,
        'materialism', jsonb_build_object(
          'centrality', 2,
          'happiness', 2,
          'success', 1
        ),
        'locusOfControl', jsonb_build_object(
          'workHard', 4,
          'destiny', 2
        ),
        'identityStability', 'Somewhat important'
      )
    )
    on conflict (id) do update set
      onboarding_completed = true,
      profile_summary = excluded.profile_summary,
      weekly_fun_budget = excluded.weekly_fun_budget,
      onboarding_answers = excluded.onboarding_answers;
  else
    raise notice 'Skipping seed for %, no auth.users row exists yet.', target_email;
  end if;

  if test_user_id is not null then
    -- Insert 20 past purchases with variety
    -- vendor_tier: 0: luxury, 1: premium, 2: mid-tier, 3: generic
    -- is_past_purchase: true for all seeded past purchases (single immediate swipe only)
    -- past_purchase_outcome: null initially, populated when user swipes
    insert into purchases (user_id, title, price, vendor, vendor_tier, category, purchase_date, source, order_id, is_past_purchase) values
    -- Electronics (mixed satisfaction patterns)
    (test_user_id, 'Wireless Noise-Cancelling Headphones', 299.99, 'Amazon', 2, 'electronics', current_date - interval '45 days', 'manual', 'ORD-001', true),
    (test_user_id, 'USB-C Hub 7-in-1', 49.99, 'Amazon', 2, 'electronics', current_date - interval '42 days', 'manual', 'ORD-002', true),
    (test_user_id, 'Mechanical Keyboard RGB', 129.00, 'Best Buy', 2, 'electronics', current_date - interval '38 days', 'manual', 'ORD-003', true),
    (test_user_id, 'Smart Watch Fitness Tracker', 199.00, 'Amazon', 2, 'electronics', current_date - interval '35 days', 'manual', 'ORD-004', true),

    -- Clothing (impulse-heavy category)
    (test_user_id, 'Designer Hoodie Limited Edition', 189.00, 'Nordstrom', 1, 'fashion', current_date - interval '32 days', 'manual', 'ORD-005', true),
    (test_user_id, 'Running Shoes Trail Pro', 145.00, 'Nike', 1, 'fashion', current_date - interval '30 days', 'manual', 'ORD-006', true),
    (test_user_id, 'Vintage Band T-Shirt', 35.00, 'Urban Outfitters', 2, 'fashion', current_date - interval '28 days', 'manual', 'ORD-007', true),
    (test_user_id, 'Winter Jacket Waterproof', 220.00, 'REI', 1, 'fashion', current_date - interval '25 days', 'manual', 'ORD-008', true),

    -- Home & Kitchen
    (test_user_id, 'Air Fryer 5.8 Qt', 89.99, 'Amazon', 2, 'home goods', current_date - interval '22 days', 'manual', 'ORD-009', true),
    (test_user_id, 'Instant Pot Duo 7-in-1', 79.95, 'Target', 2, 'home goods', current_date - interval '20 days', 'manual', 'ORD-010', true),
    (test_user_id, 'Decorative Throw Pillows Set', 65.00, 'West Elm', 1, 'home goods', current_date - interval '18 days', 'manual', 'ORD-011', true),
    (test_user_id, 'Robot Vacuum Cleaner', 349.00, 'Amazon', 2, 'home goods', current_date - interval '15 days', 'manual', 'ORD-012', true),

    -- Entertainment & Hobbies
    (test_user_id, 'Board Game Collection Bundle', 75.00, 'Target', 2, 'entertainment', current_date - interval '14 days', 'manual', 'ORD-013', true),
    (test_user_id, 'Streaming Service Annual Sub', 139.99, 'Netflix', 2, 'subscriptions', current_date - interval '12 days', 'manual', 'ORD-014', true),
    (test_user_id, 'Vinyl Record Player Retro', 129.00, 'Urban Outfitters', 2, 'electronics', current_date - interval '10 days', 'manual', 'ORD-015', true),

    -- Food & Dining (often regretted impulse)
    (test_user_id, 'Gourmet Coffee Subscription 3mo', 89.00, 'Blue Bottle', 1, 'subscriptions', current_date - interval '8 days', 'manual', 'ORD-016', true),
    (test_user_id, 'Fancy Dinner Date Night', 185.00, 'Eleven Madison Park', 0, 'food & beverage', current_date - interval '6 days', 'manual', 'ORD-017', true),

    -- Fitness & Health
    (test_user_id, 'Yoga Mat Premium Cork', 68.00, 'Lululemon', 1, 'health & wellness', current_date - interval '5 days', 'manual', 'ORD-018', true),
    (test_user_id, 'Protein Powder 5lb Tub', 54.99, 'Amazon', 2, 'health & wellness', current_date - interval '3 days', 'manual', 'ORD-019', true),

    -- Miscellaneous
    (test_user_id, 'Online Course: Web Development', 199.00, 'Udemy', 2, 'education', current_date - interval '1 day', 'manual', 'ORD-020', true)
    on conflict do nothing;

    -- Generate single immediate swipe schedule for past purchases to seed user behavior
    -- past_purchase_outcome will be populated when user swipes
    insert into swipe_schedules (user_id, purchase_id, timing, scheduled_for)
    select
      user_id,
      id,
      'immediate'::swipe_timing,
      purchase_date
    from purchases
    where user_id = test_user_id and is_past_purchase = true
    on conflict do nothing;

    -- Insert 6 test verdicts (2 buy, 2 hold, 2 skip) with full reasoning JSONB
    insert into verdicts (user_id, candidate_title, candidate_price, candidate_vendor, candidate_category, scoring_model, justification, predicted_outcome, confidence_score, reasoning, hold_release_at, created_at)
    values
    -- Buy verdicts
    (test_user_id, 'Wireless Noise-Cancelling Headphones', 299.99, 'Amazon', 'electronics', 'llm_only',
     'Need these for focus during work and commute',
     'buy', 0.88,
     jsonb_build_object(
       'valueConflict', jsonb_build_object('score', 0.15, 'explanation', 'Aligns well with your productivity and self-improvement values.'),
       'patternRepetition', jsonb_build_object('score', 0.10, 'explanation', 'No similar audio purchases in recent history.'),
       'emotionalImpulse', jsonb_build_object('score', 0.12, 'explanation', 'This appears to be a well-researched, practical decision.'),
       'financialStrain', jsonb_build_object('score', 0.45, 'explanation', 'At $300 this is 1.5x your weekly fun budget, but it is a durable investment.'),
       'longTermUtility', jsonb_build_object('score', 0.90, 'explanation', 'Noise-cancelling headphones have strong daily utility for work and commute.'),
       'emotionalSupport', jsonb_build_object('score', 0.60, 'explanation', 'Music and focus time contribute to emotional wellbeing.'),
       'shortTermRegret', jsonb_build_object('score', 0.08, 'explanation', 'Very unlikely to regret this in the short term given daily use case.'),
       'longTermRegret', jsonb_build_object('score', 0.10, 'explanation', 'Quality headphones typically last 3-5 years with high satisfaction.'),
       'rationale', '<p>This is a <strong>solid buy</strong>. The headphones align with your core values of efficiency and self-improvement — they will help you focus during work and make commutes more enjoyable. At $300, it is above your weekly fun budget, but this is a durable item you will use daily. Your purchase history shows no pattern of regret with practical electronics.</p>',
       'rationaleOneLiner', 'Solid buy — daily use for work focus and commute makes this a smart investment.',
       'alternativeSolution', null,
       'decisionScore', 0.88,
       'importantPurchase', false,
       'algorithm', 'llm_only'
     ),
     null, now() - interval '6 days'),

    (test_user_id, 'Running Shoes Trail Pro', 145.00, 'Nike', 'fashion', 'llm_only',
     'My current running shoes are worn out, need replacement for trail running',
     'buy', 0.92,
     jsonb_build_object(
       'valueConflict', jsonb_build_object('score', 0.05, 'explanation', 'Directly supports your health and self-improvement values.'),
       'patternRepetition', jsonb_build_object('score', 0.08, 'explanation', 'No repeated shoe purchases — this is a replacement for worn-out gear.'),
       'emotionalImpulse', jsonb_build_object('score', 0.05, 'explanation', 'Clear functional need, not an impulse purchase.'),
       'financialStrain', jsonb_build_object('score', 0.22, 'explanation', 'Well within budget for essential athletic gear.'),
       'longTermUtility', jsonb_build_object('score', 0.92, 'explanation', 'Trail running shoes are essential for your running routine and injury prevention.'),
       'emotionalSupport', jsonb_build_object('score', 0.70, 'explanation', 'Running is a key part of your stress management routine.'),
       'shortTermRegret', jsonb_build_object('score', 0.03, 'explanation', 'Replacing worn-out gear is almost never regretted.'),
       'longTermRegret', jsonb_build_object('score', 0.05, 'explanation', 'Nike Trail Pro has strong durability reviews.'),
       'rationale', '<p><strong>Confident buy.</strong> This is a functional replacement for worn-out gear that directly supports your running routine. The price is reasonable for quality trail shoes, and running is clearly a core part of your wellness habits. No red flags here — this is exactly the kind of purchase you tend to be satisfied with long-term.</p>',
       'rationaleOneLiner', 'Confident buy — replacing worn-out gear that supports your running routine.',
       'alternativeSolution', null,
       'decisionScore', 0.92,
       'importantPurchase', false,
       'algorithm', 'llm_only'
     ),
     null, now() - interval '5 days'),

    -- Hold verdicts
    (test_user_id, 'Robot Vacuum Cleaner', 349.00, 'Amazon', 'home goods', 'llm_only',
     'Tired of vacuuming manually, saw a good deal',
     'hold', 0.68,
     jsonb_build_object(
       'valueConflict', jsonb_build_object('score', 0.30, 'explanation', 'Convenience value is served, but minimalism value slightly conflicts with adding another gadget.'),
       'patternRepetition', jsonb_build_object('score', 0.35, 'explanation', 'You have purchased convenience gadgets before — some were used, others collected dust.'),
       'emotionalImpulse', jsonb_build_object('score', 0.40, 'explanation', 'The mention of "good deal" suggests some urgency pressure.'),
       'financialStrain', jsonb_build_object('score', 0.55, 'explanation', 'At $349 this is 1.75x your weekly fun budget — a significant purchase.'),
       'longTermUtility', jsonb_build_object('score', 0.65, 'explanation', 'Robot vacuums save time but require maintenance and work best on hard floors.'),
       'emotionalSupport', jsonb_build_object('score', 0.35, 'explanation', 'Reducing chores has a mild positive effect on daily calm.'),
       'shortTermRegret', jsonb_build_object('score', 0.30, 'explanation', 'Moderate chance you might feel the price was steep once the novelty wears off.'),
       'longTermRegret', jsonb_build_object('score', 0.35, 'explanation', 'Mixed reviews on long-term satisfaction with robot vacuums.'),
       'rationale', '<p><strong>Hold for 24 hours.</strong> This is not a bad purchase, but the "good deal" framing suggests some urgency that is worth sleeping on. At $349, it is a significant spend. Your history shows mixed results with convenience gadgets — some become daily essentials, others get forgotten. Give yourself a day to confirm this is about genuine need rather than deal excitement.</p>',
       'rationaleOneLiner', 'Hold — sleep on it; "good deal" pressure and mixed gadget history warrant a pause.',
       'alternativeSolution', '<p>Consider a high-quality cordless stick vacuum ($150-200) which takes less space and gives you more control over cleaning.</p>',
       'decisionScore', 0.68,
       'importantPurchase', false,
       'algorithm', 'llm_only'
     ),
     now() + interval '24 hours', now() - interval '4 days'),

    (test_user_id, 'Smart Watch Fitness Tracker', 199.00, 'Amazon', 'electronics', 'llm_only',
     'Want to track my runs and sleep better',
     'hold', 0.72,
     jsonb_build_object(
       'valueConflict', jsonb_build_object('score', 0.25, 'explanation', 'Supports health goals but overlaps with phone capabilities.'),
       'patternRepetition', jsonb_build_object('score', 0.40, 'explanation', 'You already have electronics in this price range — check if this fills a genuinely new need.'),
       'emotionalImpulse', jsonb_build_object('score', 0.30, 'explanation', 'Moderate impulse component — the desire to "optimize" can be a pattern.'),
       'financialStrain', jsonb_build_object('score', 0.35, 'explanation', 'Within budget but adds up with recent electronics spending.'),
       'longTermUtility', jsonb_build_object('score', 0.60, 'explanation', 'Useful if you commit to using the data, but many people stop checking after a month.'),
       'emotionalSupport', jsonb_build_object('score', 0.45, 'explanation', 'Sleep tracking can reduce anxiety about rest quality, or increase it.'),
       'shortTermRegret', jsonb_build_object('score', 0.25, 'explanation', 'Initial excitement usually lasts a few weeks.'),
       'longTermRegret', jsonb_build_object('score', 0.40, 'explanation', 'About 40% of fitness tracker buyers report decreased usage after 6 months.'),
       'rationale', '<p><strong>Hold for 24 hours.</strong> Fitness trackers are genuinely useful, but your motivation ("want to track runs and sleep better") could also be served by free phone apps. Your recent electronics spending has been on the higher side. Take a day to research whether the specific features of this watch justify the cost over what your phone already does.</p>',
       'rationaleOneLiner', 'Hold — free phone apps may cover this need; research before committing $199.',
       'alternativeSolution', '<p>Try a free app like Strava for run tracking and Sleep Cycle for sleep monitoring for 2 weeks first. If you still want dedicated hardware, you will buy it with more confidence.</p>',
       'decisionScore', 0.72,
       'importantPurchase', false,
       'algorithm', 'llm_only'
     ),
     now() + interval '24 hours', now() - interval '3 days'),

    -- Skip verdicts
    (test_user_id, 'Designer Hoodie Limited Edition', 189.00, 'Nordstrom', 'fashion', 'llm_only',
     'Saw it on Instagram, the design is really cool',
     'skip', 0.78,
     jsonb_build_object(
       'valueConflict', jsonb_build_object('score', 0.65, 'explanation', 'Conflicts with your minimalism and financial stability values — this is a want, not a need.'),
       'patternRepetition', jsonb_build_object('score', 0.70, 'explanation', 'Your regret patterns include "driven by FOMO" and "duplicated something I already had" — both apply here.'),
       'emotionalImpulse', jsonb_build_object('score', 0.80, 'explanation', 'Strong impulse signal: social media trigger, "limited edition" urgency, aesthetic-driven.'),
       'financialStrain', jsonb_build_object('score', 0.50, 'explanation', 'Nearly your full weekly fun budget for a single clothing item.'),
       'longTermUtility', jsonb_build_object('score', 0.20, 'explanation', 'A hoodie has utility, but at $189 for fashion appeal, the value proposition is weak.'),
       'emotionalSupport', jsonb_build_object('score', 0.40, 'explanation', 'Initial dopamine from the purchase, but the "limited edition" appeal fades quickly.'),
       'shortTermRegret', jsonb_build_object('score', 0.55, 'explanation', 'Likely to feel buyer''s remorse within a week once the excitement wears off.'),
       'longTermRegret', jsonb_build_object('score', 0.65, 'explanation', 'High chance this becomes a closet item you rarely wear.'),
       'rationale', '<p><strong>Skip this one.</strong> This hits multiple red flags in your profile: it was triggered by social media, uses "limited edition" urgency, and conflicts with your minimalism values. You already have hoodies you wear regularly. At $189, this is almost your entire weekly fun budget for a fashion impulse. Your past regret patterns strongly suggest you would not be satisfied with this purchase long-term.</p>',
       'rationaleOneLiner', 'Skip — Instagram-triggered FOMO buy that conflicts with your minimalism values.',
       'alternativeSolution', '<p>If you genuinely want a new hoodie, wait 2 weeks and browse in-store without the social media pressure. You will likely find something you love just as much for under $80.</p>',
       'decisionScore', 0.78,
       'importantPurchase', false,
       'algorithm', 'llm_only'
     ),
     null, now() - interval '2 days'),

    (test_user_id, 'Decorative Throw Pillows Set', 65.00, 'West Elm', 'home goods', 'llm_only',
     'Living room looks bare, want to make it cozier',
     'skip', 0.70,
     jsonb_build_object(
       'valueConflict', jsonb_build_object('score', 0.50, 'explanation', 'Aesthetic enjoyment is a value of yours, but this conflicts with minimalism and low clutter.'),
       'patternRepetition', jsonb_build_object('score', 0.55, 'explanation', 'Decorative home purchases have a mixed track record in your history — some feel right, others become clutter.'),
       'emotionalImpulse', jsonb_build_object('score', 0.50, 'explanation', 'Redecorating urges often come in waves and pass without regret.'),
       'financialStrain', jsonb_build_object('score', 0.15, 'explanation', 'Affordable relative to your budget.'),
       'longTermUtility', jsonb_build_object('score', 0.30, 'explanation', 'Throw pillows add ambiance but are not functional — they often end up moved aside.'),
       'emotionalSupport', jsonb_build_object('score', 0.45, 'explanation', 'A cozier space can improve mood, but new pillows alone rarely transform a room.'),
       'shortTermRegret', jsonb_build_object('score', 0.40, 'explanation', 'Moderate chance the "bare room" feeling is temporary.'),
       'longTermRegret', jsonb_build_object('score', 0.50, 'explanation', 'Decorative items often feel less exciting once the novelty fades.'),
       'rationale', '<p><strong>Skip for now.</strong> While your living room aesthetics matter to you, throw pillows are the kind of purchase that feels urgent in the moment but rarely makes the impact you imagine. Your regret patterns include items that "didn''t get used" and "duplicated something I already had." Try rearranging what you already have first — sometimes a fresh layout makes a bigger difference than new accessories.</p>',
       'rationaleOneLiner', 'Skip — rearrange what you have first; decorative buys rarely make the impact you expect.',
       'alternativeSolution', '<p>Rearrange your existing furniture and decor first. If the room still feels bare after a week, consider one statement piece (a plant or art print) instead of multiple small items.</p>',
       'decisionScore', 0.70,
       'importantPurchase', false,
       'algorithm', 'llm_only'
     ),
     null, now() - interval '1 day')
    on conflict do nothing;

    -- Add some user values for the test user
    insert into user_values (user_id, value_type, preference_score)
    values
      (test_user_id, 'interpersonal_value', 3),
      (test_user_id, 'durability', 5),
      (test_user_id, 'efficiency', 5),
      (test_user_id, 'emotional_value', 3),
      (test_user_id, 'aesthetics', 4)
    on conflict (user_id, value_type) do update set preference_score = excluded.preference_score;
  end if;
end $$;

-- Re-enable RLS
alter table users enable row level security;
alter table purchases enable row level security;
alter table user_values enable row level security;
alter table swipe_schedules enable row level security;
alter table swipes enable row level security;
alter table verdicts enable row level security;
