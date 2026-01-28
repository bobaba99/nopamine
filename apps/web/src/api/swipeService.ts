import { supabase } from './supabaseClient'
import type { SwipeOutcome, SwipeQueueItem, SwipeTiming } from './types'

export async function getUnratedPurchases(userId: string): Promise<SwipeQueueItem[]> {
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('swipe_schedules')
    .select(
      'id, timing, scheduled_for, purchase:purchase_id (id, title, price, vendor, category, purchase_date)',
    )
    .eq('user_id', userId)
    .is('completed_at', null)
    .lte('scheduled_for', today)
    .order('scheduled_for', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (
    data?.map((row) => ({
      schedule_id: row.id,
      timing: row.timing as SwipeTiming,
      scheduled_for: row.scheduled_for,
      purchase: row.purchase,
    })) ?? []
  )
}

export async function createSwipe(
  userId: string,
  purchaseId: string,
  outcome: SwipeOutcome,
  timing: SwipeTiming,
  scheduleId: string
): Promise<{ error: string | null; isDuplicate: boolean }> {
  const { error } = await supabase.from('swipes').insert({
    user_id: userId,
    purchase_id: purchaseId,
    schedule_id: scheduleId,
    timing,
    outcome,
  })

  if (error) {
    const isDuplicate = error.code === '23505'
    return {
      error: isDuplicate ? 'Already rated this purchase.' : error.message,
      isDuplicate,
    }
  }

  const { error: scheduleError } = await supabase
    .from('swipe_schedules')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', scheduleId)
    .eq('user_id', userId)

  if (scheduleError) {
    return { error: scheduleError.message, isDuplicate: false }
  }

  return { error: null, isDuplicate: false }
}

export async function deleteSwipe(
  userId: string,
  scheduleId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('swipes')
    .delete()
    .eq('user_id', userId)
    .eq('schedule_id', scheduleId)

  if (error) {
    return { error: error.message }
  }

  const { error: scheduleError } = await supabase
    .from('swipe_schedules')
    .update({ completed_at: null })
    .eq('id', scheduleId)
    .eq('user_id', userId)

  return { error: scheduleError?.message ?? null }
}
