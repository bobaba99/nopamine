import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildOAuthRedirectUrl,
  extractAuthCallbackError,
  hasAuthCallbackParams,
  shouldWaitForAuthSession,
} from '../src/utils/authFlow'

test('buildOAuthRedirectUrl sends OAuth callbacks to /auth', () => {
  assert.equal(buildOAuthRedirectUrl('http://localhost:5173'), 'http://localhost:5173/auth')
})

test('extractAuthCallbackError reads error details from the URL hash', () => {
  assert.equal(
    extractAuthCallbackError('#error=server_error&error_description=OAuth%20exchange%20failed', ''),
    'OAuth exchange failed',
  )
})

test('extractAuthCallbackError reads error details from the URL query string', () => {
  assert.equal(
    extractAuthCallbackError('', '?error=access_denied&error_description=User+canceled'),
    'User canceled',
  )
})

test('extractAuthCallbackError ignores successful OAuth callback hashes', () => {
  assert.equal(
    extractAuthCallbackError('#access_token=token&refresh_token=refresh', ''),
    null,
  )
})

test('hasAuthCallbackParams detects successful and failed auth callbacks', () => {
  assert.equal(hasAuthCallbackParams('#access_token=token', ''), true)
  assert.equal(hasAuthCallbackParams('', '?error=access_denied'), true)
  assert.equal(hasAuthCallbackParams('', '?code=oauth-code'), true)
  assert.equal(hasAuthCallbackParams('', ''), false)
})

test('shouldWaitForAuthSession keeps the loading gate up during a callback if only an anonymous session exists', () => {
  assert.equal(shouldWaitForAuthSession(true, true, false), true)
  assert.equal(shouldWaitForAuthSession(true, false, false), false)
  assert.equal(shouldWaitForAuthSession(false, true, false), false)
  assert.equal(shouldWaitForAuthSession(true, false, true), false)
})
