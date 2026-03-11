import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getSupabaseServerKey,
  getSupabaseServerUrl,
  hasSupabaseServerConfig,
} from '../src/config/supabaseEnv'

test('getSupabaseServerUrl prefers the server-side env name and falls back to Vite env name', () => {
  assert.equal(
    getSupabaseServerUrl({
      SUPABASE_URL: 'https://server.example',
      VITE_SUPABASE_URL: 'https://vite.example',
    }),
    'https://server.example',
  )
  assert.equal(
    getSupabaseServerUrl({
      VITE_SUPABASE_URL: 'https://vite.example',
    }),
    'https://vite.example',
  )
})

test('getSupabaseServerKey prefers service-role or secret names and falls back to the current Vite secret name', () => {
  assert.equal(
    getSupabaseServerKey({
      SUPABASE_SERVICE_ROLE_KEY: 'service-role',
      SUPABASE_SECRET_KEY: 'secret',
      VITE_SUPABASE_SECRET_KEY: 'vite-secret',
    }),
    'service-role',
  )
  assert.equal(
    getSupabaseServerKey({
      SUPABASE_SECRET_KEY: 'secret',
      VITE_SUPABASE_SECRET_KEY: 'vite-secret',
    }),
    'secret',
  )
  assert.equal(
    getSupabaseServerKey({
      VITE_SUPABASE_SECRET_KEY: 'vite-secret',
    }),
    'vite-secret',
  )
})

test('hasSupabaseServerConfig requires both URL and server key', () => {
  assert.equal(
    hasSupabaseServerConfig({
      SUPABASE_URL: 'https://server.example',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role',
    }),
    true,
  )
  assert.equal(
    hasSupabaseServerConfig({
      VITE_SUPABASE_URL: 'https://vite.example',
      VITE_SUPABASE_SECRET_KEY: 'vite-secret',
    }),
    true,
  )
  assert.equal(
    hasSupabaseServerConfig({
      SUPABASE_URL: 'https://server.example',
    }),
    false,
  )
})
