type SupabaseBrowserEnv = Record<string, string | undefined>

export const getSupabaseClientKey = (env: SupabaseBrowserEnv) =>
  env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.VITE_SUPABASE_ANON_KEY ?? ''

export const hasSupabaseBrowserConfig = (env: SupabaseBrowserEnv) =>
  Boolean(env.VITE_SUPABASE_URL && getSupabaseClientKey(env))
