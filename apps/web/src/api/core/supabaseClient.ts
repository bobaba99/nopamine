import { createClient } from '@supabase/supabase-js'
import { getSupabaseClientKey } from '../../utils/supabaseEnv'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
const supabaseClientKey = getSupabaseClientKey(import.meta.env)

if (!supabaseUrl || !supabaseClientKey) {
  console.warn(
    'Missing VITE_SUPABASE_URL and browser auth key (VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY)',
  )
}

export const supabase = createClient(supabaseUrl, supabaseClientKey)
