const stripPrefix = (value: string, prefix: string) =>
  value.startsWith(prefix) ? value.slice(prefix.length) : value

const getUrlSearchParams = (value: string, prefix: '#' | '?') =>
  new URLSearchParams(stripPrefix(value, prefix))

export const buildOAuthRedirectUrl = (origin: string) => new URL('/auth', origin).toString()

export const extractAuthCallbackError = (hash: string, search: string) => {
  const params = [getUrlSearchParams(hash, '#'), getUrlSearchParams(search, '?')]

  for (const current of params) {
    const message = current.get('error_description') ?? current.get('error')
    if (message) {
      return message
    }
  }

  return null
}

export const hasAuthCallbackParams = (hash: string, search: string) => {
  const hashParams = getUrlSearchParams(hash, '#')
  const searchParams = getUrlSearchParams(search, '?')

  return Boolean(
    hashParams.get('access_token') ||
    hashParams.get('error') ||
    hashParams.get('error_description') ||
    searchParams.get('code') ||
    searchParams.get('error') ||
    searchParams.get('error_description'),
  )
}

export const shouldWaitForAuthSession = (
  hasAuthCallback: boolean,
  isAnonymousSession: boolean,
  hasAuthError: boolean,
) => hasAuthCallback && isAnonymousSession && !hasAuthError
