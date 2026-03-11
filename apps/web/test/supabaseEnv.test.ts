import test from 'node:test'
import assert from 'node:assert/strict'

import { getSupabaseClientKey, hasSupabaseBrowserConfig } from '../src/utils/supabaseEnv'

test('getSupabaseClientKey prefers the publishable key when present', () => {
  assert.equal(
    getSupabaseClientKey({
      VITE_SUPABASE_PUBLISHABLE_KEY: 'publishable',
      VITE_SUPABASE_ANON_KEY: 'anon',
    }),
    'publishable',
  )
})

test('getSupabaseClientKey falls back to the legacy anon key', () => {
  assert.equal(
    getSupabaseClientKey({
      VITE_SUPABASE_ANON_KEY: 'anon',
    }),
    'anon',
  )
})

test('hasSupabaseBrowserConfig requires both URL and a browser-safe key', () => {
  assert.equal(
    hasSupabaseBrowserConfig({
      VITE_SUPABASE_URL: 'https://project.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'publishable',
    }),
    true,
  )
  assert.equal(
    hasSupabaseBrowserConfig({
      VITE_SUPABASE_URL: 'https://project.supabase.co',
    }),
    false,
  )
})
