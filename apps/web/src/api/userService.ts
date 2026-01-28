import { supabase } from './supabaseClient'
import type { UserRow, UserValueRow } from './types'

export async function getUserProfile(userId: string): Promise<UserRow | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, created_at, last_active, onboarding_completed')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data as UserRow | null
}

export async function createUserProfile(
  userId: string,
  email: string
): Promise<{ error: string | null; isConflict: boolean }> {
  const { error } = await supabase.from('users').insert({
    id: userId,
    email,
    last_active: new Date().toISOString(),
  })

  if (error) {
    const isConflict = error.code === '23505'
    return { error: error.message, isConflict }
  }

  return { error: null, isConflict: false }
}

export async function getUserValues(userId: string): Promise<UserValueRow[]> {
  const { data, error } = await supabase
    .from('user_values')
    .select('id, value_type, preference_score, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as UserValueRow[]
}

export async function createUserValue(
  valueType: string,
  preferenceScore: number
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('add_user_value', {
    p_value_type: valueType,
    p_preference_score: preferenceScore,
  })

  return { error: error?.message ?? null }
}

export async function updateUserValue(
  userId: string,
  valueId: string,
  preferenceScore: number
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('user_values')
    .update({ preference_score: preferenceScore })
    .eq('id', valueId)
    .eq('user_id', userId)

  return { error: error?.message ?? null }
}

export async function deleteUserValue(
  userId: string,
  valueId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('user_values')
    .delete()
    .eq('id', valueId)
    .eq('user_id', userId)

  return { error: error?.message ?? null }
}
