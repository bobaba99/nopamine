import { Router } from 'express'
import type express from 'express'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { PostHog } from 'posthog-node'
import type multer from 'multer'
import type { AdminRequest, ResourceUpsertBody } from '../types'

const RESOURCE_IMAGES_BUCKET = 'resource-images'

const toDbRow = (row: Record<string, unknown>) => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  summary: row.summary,
  body_markdown: row.body_markdown,
  tags: row.tags ?? [],
  reading_time_minutes: row.reading_time_minutes,
  canonical_url: row.canonical_url,
  cover_image_url: row.cover_image_url,
  cta_url: row.cta_url,
  is_published: row.is_published ?? false,
  published_at: row.published_at,
  created_at: row.created_at,
  updated_at: row.updated_at,
})

const validateResourceBody = (body: ResourceUpsertBody, res: express.Response): boolean => {
  if (!body.slug?.trim()) {
    res.status(400).json({ error: 'Slug is required.' })
    return false
  }
  if (!body.title?.trim()) {
    res.status(400).json({ error: 'Title is required.' })
    return false
  }
  if (!body.summary?.trim()) {
    res.status(400).json({ error: 'Summary is required.' })
    return false
  }
  if (!body.bodyMarkdown?.trim()) {
    res.status(400).json({ error: 'Body content is required.' })
    return false
  }
  if (!Array.isArray(body.tags) || body.tags.length === 0) {
    res.status(400).json({ error: 'At least one tag is required.' })
    return false
  }
  return true
}

export const createAdminRoutes = (
  supabase: () => SupabaseClient,
  posthog: PostHog,
  requireAdmin: express.RequestHandler,
  upload: multer.Multer,
) => {
  const router = Router()

  router.get('/resources', requireAdmin, async (_req, res) => {
    const { data, error } = await supabase()
      .from('resources')
      .select('id, slug, title, summary, body_markdown, tags, reading_time_minutes, canonical_url, cover_image_url, cta_url, is_published, published_at, created_at, updated_at')
      .order('updated_at', { ascending: false })

    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    res.json({ data: (data ?? []).map(toDbRow) })
  })

  router.post('/resources', requireAdmin, async (req, res) => {
    const body = req.body as ResourceUpsertBody
    const adminUser = (req as AdminRequest).adminUser
    const now = new Date().toISOString()
    const publishedAt = body.isPublished ? (body.publishedAt ?? now) : null

    if (!validateResourceBody(body, res)) return

    const { data, error } = await supabase()
      .from('resources')
      .insert({
        slug: body.slug.trim(),
        title: body.title.trim(),
        summary: body.summary.trim(),
        body_markdown: body.bodyMarkdown.trim(),
        tags: body.tags,
        reading_time_minutes: body.readingTimeMinutes ?? null,
        canonical_url: body.canonicalUrl?.trim() || null,
        cover_image_url: body.coverImageUrl?.trim() || null,
        cta_url: body.ctaUrl?.trim() || null,
        is_published: body.isPublished ?? false,
        published_at: publishedAt,
        created_by: adminUser.id,
        updated_by: adminUser.id,
      })
      .select()
      .single()

    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    posthog.capture({
      distinctId: adminUser.id,
      event: 'resource_created',
      properties: { resource_id: data.id, slug: body.slug.trim(), title: body.title.trim(), is_published: body.isPublished ?? false, tag_count: body.tags.length },
    })
    res.json({ data: toDbRow(data) })
  })

  router.put('/resources/:resourceId', requireAdmin, async (req, res) => {
    const { resourceId } = req.params
    const body = req.body as ResourceUpsertBody
    const adminUser = (req as AdminRequest).adminUser
    const now = new Date().toISOString()
    const publishedAt = body.isPublished ? (body.publishedAt ?? now) : null

    if (!validateResourceBody(body, res)) return

    const { data, error } = await supabase()
      .from('resources')
      .update({
        slug: body.slug.trim(),
        title: body.title.trim(),
        summary: body.summary.trim(),
        body_markdown: body.bodyMarkdown.trim(),
        tags: body.tags,
        reading_time_minutes: body.readingTimeMinutes ?? null,
        canonical_url: body.canonicalUrl?.trim() || null,
        cover_image_url: body.coverImageUrl?.trim() || null,
        cta_url: body.ctaUrl?.trim() || null,
        is_published: body.isPublished ?? false,
        published_at: publishedAt,
        updated_by: adminUser.id,
        updated_at: now,
      })
      .eq('id', resourceId)
      .select()
      .single()

    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    posthog.capture({
      distinctId: adminUser.id,
      event: 'resource_updated',
      properties: { resource_id: resourceId, slug: body.slug.trim(), title: body.title.trim(), is_published: body.isPublished ?? false },
    })
    res.json({ data: toDbRow(data) })
  })

  router.post('/resources/:resourceId/publish', requireAdmin, async (req, res) => {
    const { resourceId } = req.params
    const adminUser = (req as AdminRequest).adminUser
    const now = new Date().toISOString()

    const { data, error } = await supabase()
      .from('resources')
      .update({ is_published: true, published_at: now })
      .eq('id', resourceId)
      .select()
      .single()

    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    posthog.capture({
      distinctId: adminUser.id,
      event: 'resource_published',
      properties: { resource_id: resourceId, slug: data.slug, title: data.title },
    })
    res.json({ data: toDbRow(data) })
  })

  router.post('/resources/:resourceId/unpublish', requireAdmin, async (req, res) => {
    const { resourceId } = req.params
    const adminUser = (req as AdminRequest).adminUser

    const { data, error } = await supabase()
      .from('resources')
      .update({ is_published: false, published_at: null })
      .eq('id', resourceId)
      .select()
      .single()

    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    posthog.capture({
      distinctId: adminUser.id,
      event: 'resource_unpublished',
      properties: { resource_id: resourceId, slug: data.slug, title: data.title },
    })
    res.json({ data: toDbRow(data) })
  })

  router.delete('/resources/:resourceId', requireAdmin, async (req, res) => {
    const { resourceId } = req.params
    const adminUser = (req as AdminRequest).adminUser

    const { error } = await supabase()
      .from('resources')
      .delete()
      .eq('id', resourceId)

    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    posthog.capture({
      distinctId: adminUser.id,
      event: 'resource_deleted',
      properties: { resource_id: resourceId },
    })
    res.status(204).send()
  })

  router.post(
    '/resources/upload-image',
    requireAdmin,
    upload.single('image'),
    async (req, res) => {
      const adminUser = (req as AdminRequest).adminUser
      const file = req.file
      if (!file) {
        res.status(400).json({ error: 'No image file provided.' })
        return
      }
      const allowedTypes = ['image/png', 'image/jpeg', 'image/gif']
      if (!allowedTypes.includes(file.mimetype)) {
        res.status(400).json({ error: 'Invalid image type. Allowed: PNG, JPEG, GIF.' })
        return
      }

      const ext = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/gif' ? 'gif' : 'jpg'
      const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { data, error } = await supabase().storage
        .from(RESOURCE_IMAGES_BUCKET)
        .upload(path, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        })

      if (error) {
        res.status(500).json({ error: error.message })
        return
      }

      const { data: urlData } = supabase().storage.from(RESOURCE_IMAGES_BUCKET).getPublicUrl(data.path)
      posthog.capture({
        distinctId: adminUser.id,
        event: 'image_uploaded',
        properties: { mime_type: file.mimetype, file_size: file.size },
      })
      res.json({ url: urlData.publicUrl })
    },
  )

  return router
}
