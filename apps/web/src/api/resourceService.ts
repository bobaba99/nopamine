import { supabase } from './supabaseClient'
import type { ResourceListItem } from './types'

export async function getPublishedResources(limit = 50): Promise<ResourceListItem[]> {
  const { data, error } = await supabase
    .from('resources')
    .select(
      'id, slug, title, summary, category, tags, reading_time_minutes, canonical_url, cover_image_url, cta_url, published_at, created_at'
    )
    .eq('is_published', true)
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as ResourceListItem[]
}
