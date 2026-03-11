type SupabaseServerEnv = Record<string, string | undefined>

export const getSupabaseServerUrl = (env: SupabaseServerEnv) =>
  env.SUPABASE_URL ?? env.VITE_SUPABASE_URL ?? ''

export const getSupabaseServerKey = (env: SupabaseServerEnv) =>
  env.SUPABASE_SERVICE_ROLE_KEY ??
  env.SUPABASE_SECRET_KEY ??
  env.VITE_SUPABASE_SECRET_KEY ??
  ''

export const hasSupabaseServerConfig = (env: SupabaseServerEnv) =>
  Boolean(getSupabaseServerUrl(env) && getSupabaseServerKey(env))
