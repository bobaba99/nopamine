import type { ResourceRow } from './types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

type ResourceUpsertInput = {
  slug: string
  title: string
  summary: string
  bodyMarkdown: string
  category: string | null
  tags: string[]
  readingTimeMinutes: number | null
  canonicalUrl: string | null
  coverImageUrl: string | null
  ctaUrl: string | null
  isPublished: boolean
  publishedAt: string | null
}

const withAuthHeaders = (accessToken: string, extraHeaders?: Record<string, string>) => ({
  Authorization: `Bearer ${accessToken}`,
  ...(extraHeaders ?? {}),
})

const assertOk = async (response: Response) => {
  if (response.ok) return
  let message = `Request failed with status ${response.status}`
  try {
    const payload = (await response.json()) as { error?: string }
    if (payload.error) {
      message = payload.error
    }
  } catch {
    // no-op fallback for non-json responses
  }
  throw new Error(message)
}

export async function getAdminResources(accessToken: string): Promise<ResourceRow[]> {
  const response = await fetch(`${API_BASE_URL}/admin/resources`, {
    headers: withAuthHeaders(accessToken),
  })
  await assertOk(response)
  const payload = (await response.json()) as { data: ResourceRow[] }
  return payload.data ?? []
}

export async function createAdminResource(
  accessToken: string,
  input: ResourceUpsertInput
): Promise<ResourceRow> {
  const response = await fetch(`${API_BASE_URL}/admin/resources`, {
    method: 'POST',
    headers: withAuthHeaders(accessToken, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(input),
  })
  await assertOk(response)
  const payload = (await response.json()) as { data: ResourceRow }
  return payload.data
}

export async function updateAdminResource(
  accessToken: string,
  resourceId: string,
  input: ResourceUpsertInput
): Promise<ResourceRow> {
  const response = await fetch(`${API_BASE_URL}/admin/resources/${resourceId}`, {
    method: 'PUT',
    headers: withAuthHeaders(accessToken, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(input),
  })
  await assertOk(response)
  const payload = (await response.json()) as { data: ResourceRow }
  return payload.data
}

export async function publishAdminResource(
  accessToken: string,
  resourceId: string
): Promise<ResourceRow> {
  const response = await fetch(`${API_BASE_URL}/admin/resources/${resourceId}/publish`, {
    method: 'POST',
    headers: withAuthHeaders(accessToken),
  })
  await assertOk(response)
  const payload = (await response.json()) as { data: ResourceRow }
  return payload.data
}

export async function unpublishAdminResource(
  accessToken: string,
  resourceId: string
): Promise<ResourceRow> {
  const response = await fetch(`${API_BASE_URL}/admin/resources/${resourceId}/unpublish`, {
    method: 'POST',
    headers: withAuthHeaders(accessToken),
  })
  await assertOk(response)
  const payload = (await response.json()) as { data: ResourceRow }
  return payload.data
}

export async function deleteAdminResource(
  accessToken: string,
  resourceId: string
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/admin/resources/${resourceId}`, {
    method: 'DELETE',
    headers: withAuthHeaders(accessToken),
  })
  await assertOk(response)
}

export async function uploadAdminResourceImage(
  accessToken: string,
  image: File
): Promise<string> {
  const formData = new FormData()
  formData.append('image', image)

  const response = await fetch(`${API_BASE_URL}/admin/resources/upload-image`, {
    method: 'POST',
    headers: withAuthHeaders(accessToken),
    body: formData,
  })
  await assertOk(response)
  const payload = (await response.json()) as { url: string }
  return payload.url
}

export type { ResourceUpsertInput }
