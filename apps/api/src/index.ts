import cors from 'cors'
import express from 'express'
import multer from 'multer'
import { fileTypeFromBuffer } from 'file-type'
import { createClient, type User } from '@supabase/supabase-js'

const app = express()
const PORT = process.env.PORT || 3000

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter((value) => value.length > 0)
const CORS_ORIGINS = (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
  .split(',')
  .map((value) => value.trim())
  .filter((value) => value.length > 0)
const RESOURCES_IMAGE_BUCKET = process.env.RESOURCES_IMAGE_BUCKET ?? 'resource-images'

const hasApiConfig = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
const hasAdminConfig = ADMIN_EMAILS.length > 0
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

if (!hasApiConfig) {
  console.warn('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
}

if (!hasAdminConfig) {
  console.warn('Missing ADMIN_EMAILS. Admin routes will reject requests.')
}

const supabaseAdmin = hasApiConfig
  ? createClient(SUPABASE_URL as string, SUPABASE_SERVICE_ROLE_KEY as string)
  : null

let hasCheckedBucket = false
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/gif']
    const isAllowed = allowedMimeTypes.includes(file.mimetype)
    if (!isAllowed) {
      callback(new Error('Only PNG, JPEG, and GIF images are allowed.'))
      return
    }
    callback(null, true)
  },
})

type AdminRequest = express.Request & {
  adminUser?: User
}

type ResourceUpsertPayload = {
  slug: string
  title: string
  summary: string
  bodyMarkdown: string
  category?: string | null
  tags?: string[]
  readingTimeMinutes?: number | null
  canonicalUrl?: string | null
  coverImageUrl?: string | null
  ctaUrl?: string | null
  isPublished?: boolean
  publishedAt?: string | null
}

const getAuthToken = (authorizationHeader: string | undefined) => {
  if (!authorizationHeader) return null
  const [scheme, token] = authorizationHeader.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null
  return token
}

const normalizeTags = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

const requireAdmin = async (
  req: AdminRequest,
  res: express.Response,
  next: express.NextFunction
) => {
  if (!supabaseAdmin || !hasApiConfig) {
    res.status(500).json({ error: 'API is missing Supabase service configuration.' })
    return
  }

  if (!hasAdminConfig) {
    res.status(500).json({ error: 'API is missing ADMIN_EMAILS configuration.' })
    return
  }

  const token = getAuthToken(req.headers.authorization)
  if (!token) {
    res.status(401).json({ error: 'Missing Bearer token.' })
    return
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data.user?.email) {
    res.status(401).json({ error: 'Invalid or expired auth token.' })
    return
  }

  const isAdmin = ADMIN_EMAILS.includes(data.user.email.toLowerCase())
  if (!isAdmin) {
    res.status(403).json({ error: 'Admin access required.' })
    return
  }

  req.adminUser = data.user
  next()
}

const ensureImageBucket = async () => {
  if (!supabaseAdmin || hasCheckedBucket) return

  const { data: existingBucket } = await supabaseAdmin.storage.getBucket(
    RESOURCES_IMAGE_BUCKET
  )
  if (!existingBucket) {
    const { error } = await supabaseAdmin.storage.createBucket(RESOURCES_IMAGE_BUCKET, {
      public: true,
      fileSizeLimit: 8 * 1024 * 1024,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif'],
    })
    if (error) {
      throw new Error(error.message)
    }
  }

  hasCheckedBucket = true
}

const sanitizeFileName = (value: string) => {
  return value.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-')
}

const isValidHttpUrl = (value: string | null | undefined) => {
  if (!value || value.trim().length === 0) {
    return true
  }
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

const validateResourcePayload = (payload: ResourceUpsertPayload) => {
  const normalizedSlug = payload.slug.trim()
  if (normalizedSlug.length < 3 || normalizedSlug.length > 120) {
    return 'Slug must be between 3 and 120 characters.'
  }
  if (!isValidHttpUrl(payload.canonicalUrl)) {
    return 'canonicalUrl must be a valid http/https URL.'
  }
  if (!isValidHttpUrl(payload.coverImageUrl)) {
    return 'coverImageUrl must be a valid http/https URL.'
  }
  if (!isValidHttpUrl(payload.ctaUrl)) {
    return 'ctaUrl must be a valid http/https URL.'
  }
  return null
}

const assertValidResourceId = (resourceId: string) => UUID_REGEX.test(resourceId)

const toResourceRecord = (payload: ResourceUpsertPayload, adminUserId: string) => {
  const isPublished = payload.isPublished === true
  const publishedAt = isPublished
    ? (payload.publishedAt ?? new Date().toISOString())
    : null

  return {
    slug: payload.slug.trim(),
    title: payload.title.trim(),
    summary: payload.summary.trim(),
    body_markdown: payload.bodyMarkdown,
    category: payload.category?.trim() || null,
    tags: normalizeTags(payload.tags),
    reading_time_minutes: payload.readingTimeMinutes ?? null,
    canonical_url: payload.canonicalUrl?.trim() || null,
    cover_image_url: payload.coverImageUrl?.trim() || null,
    cta_url: payload.ctaUrl?.trim() || null,
    is_published: isPublished,
    published_at: publishedAt,
    updated_by: adminUserId,
  }
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || CORS_ORIGINS.includes(origin)) {
        callback(null, true)
        return
      }
      callback(new Error('Origin not allowed by CORS'))
    },
    credentials: true,
  })
)
app.use(express.json({ limit: '5mb' }))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.get('/admin/resources', requireAdmin, async (_req, res) => {
  const { data, error } = await supabaseAdmin!
    .from('resources')
    .select('*')
    .order('updated_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false, nullsFirst: false })

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.json({ data: data ?? [] })
})

app.post('/admin/resources', requireAdmin, async (req: AdminRequest, res) => {
  const payload = req.body as ResourceUpsertPayload
  if (!payload.slug || !payload.title || !payload.summary || !payload.bodyMarkdown) {
    res.status(400).json({ error: 'slug, title, summary, and bodyMarkdown are required.' })
    return
  }
  const payloadError = validateResourcePayload(payload)
  if (payloadError) {
    res.status(400).json({ error: payloadError })
    return
  }

  const resourceRecord = toResourceRecord(payload, req.adminUser!.id)
  const { data, error } = await supabaseAdmin!
    .from('resources')
    .insert({
      ...resourceRecord,
      created_by: req.adminUser!.id,
    })
    .select('*')
    .single()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.status(201).json({ data })
})

app.put('/admin/resources/:id', requireAdmin, async (req: AdminRequest, res) => {
  if (!assertValidResourceId(req.params.id)) {
    res.status(400).json({ error: 'Invalid resource id.' })
    return
  }

  const payload = req.body as ResourceUpsertPayload
  if (!payload.slug || !payload.title || !payload.summary || !payload.bodyMarkdown) {
    res.status(400).json({ error: 'slug, title, summary, and bodyMarkdown are required.' })
    return
  }
  const payloadError = validateResourcePayload(payload)
  if (payloadError) {
    res.status(400).json({ error: payloadError })
    return
  }

  const { data, error } = await supabaseAdmin!
    .from('resources')
    .update({
      ...toResourceRecord(payload, req.adminUser!.id),
      updated_at: new Date().toISOString(),
    })
    .eq('id', req.params.id)
    .select('*')
    .single()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.json({ data })
})

app.post('/admin/resources/:id/publish', requireAdmin, async (req: AdminRequest, res) => {
  if (!assertValidResourceId(req.params.id)) {
    res.status(400).json({ error: 'Invalid resource id.' })
    return
  }

  const { data, error } = await supabaseAdmin!
    .from('resources')
    .update({
      is_published: true,
      published_at: new Date().toISOString(),
      updated_by: req.adminUser!.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', req.params.id)
    .select('*')
    .single()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.json({ data })
})

app.post('/admin/resources/:id/unpublish', requireAdmin, async (req: AdminRequest, res) => {
  if (!assertValidResourceId(req.params.id)) {
    res.status(400).json({ error: 'Invalid resource id.' })
    return
  }

  const { data, error } = await supabaseAdmin!
    .from('resources')
    .update({
      is_published: false,
      published_at: null,
      updated_by: req.adminUser!.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', req.params.id)
    .select('*')
    .single()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.json({ data })
})

app.post(
  '/admin/resources/upload-image',
  requireAdmin,
  upload.single('image'),
  async (req: AdminRequest, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'Image file is required.' })
      return
    }

    try {
      await ensureImageBucket()
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unable to ensure image bucket.',
      })
      return
    }

    const originalName = req.file.originalname?.trim() || 'image'
    const fileName = sanitizeFileName(originalName) || 'image'
    const filePath = `${req.adminUser!.id}/${Date.now()}-${fileName}`
    const fileType = await fileTypeFromBuffer(req.file.buffer)
    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/gif']
    if (!fileType || !allowedMimeTypes.includes(fileType.mime)) {
      res.status(400).json({ error: 'Invalid image file type.' })
      return
    }

    const { error: uploadError } = await supabaseAdmin!.storage
      .from(RESOURCES_IMAGE_BUCKET)
      .upload(filePath, req.file.buffer, {
        contentType: fileType.mime,
        upsert: false,
      })

    if (uploadError) {
      res.status(500).json({ error: uploadError.message })
      return
    }

    const { data: publicUrlData } = supabaseAdmin!.storage
      .from(RESOURCES_IMAGE_BUCKET)
      .getPublicUrl(filePath)

    res.status(201).json({ url: publicUrlData.publicUrl })
  }
)

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof multer.MulterError) {
    res.status(400).json({ error: error.message })
    return
  }
  if (error instanceof Error) {
    res.status(400).json({ error: error.message })
    return
  }
  res.status(500).json({ error: 'Unexpected server error.' })
})

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`)
})
