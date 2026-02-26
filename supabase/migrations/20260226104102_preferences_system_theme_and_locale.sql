-- Allow 'system' theme mode and optional locale field in preferences JSONB
alter table users drop constraint if exists users_preferences_shape_check;

alter table users add constraint users_preferences_shape_check check (
  preferences is null
  or (
    jsonb_typeof(preferences) = 'object'
    and (
      not (preferences ? 'theme')
      or (preferences ->> 'theme') in ('light', 'dark', 'system')
    )
    and (
      not (preferences ? 'locale')
      or length(trim(preferences ->> 'locale')) > 0
    )
    and (
      not (preferences ? 'currency')
      or length(trim(preferences ->> 'currency')) > 0
    )
    and (
      not (preferences ? 'hold_duration_hours')
      or (preferences ->> 'hold_duration_hours') in ('24', '48', '72')
    )
    and (
      not (preferences ? 'hold_reminders_enabled')
      or jsonb_typeof(preferences -> 'hold_reminders_enabled') = 'boolean'
    )
  )
);
