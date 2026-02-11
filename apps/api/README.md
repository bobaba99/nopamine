# API (`apps/api`)

Admin article editor backend. Runs on port 3000 by default.

## Environment

Create `apps/api/.env`:

```bash
PORT=3000
SUPABASE_URL=          # Same as VITE_SUPABASE_URL in apps/web
SUPABASE_SERVICE_ROLE_KEY=   # From Supabase project settings (not the anon key)
ADMIN_EMAILS=admin1@example.com,admin2@example.com   # Comma-separated admin emails
```

## Run

```bash
npm --workspace apps/api run dev
```

## Endpoints

- `GET /health` — Health check
- `GET /admin/resources` — List all articles (admin)
- `POST /admin/resources` — Create article (admin)
- `PUT /admin/resources/:id` — Update article (admin)
- `POST /admin/resources/:id/publish` — Publish article (admin)
- `POST /admin/resources/:id/unpublish` — Unpublish article (admin)
- `DELETE /admin/resources/:id` — Delete article (admin)
- `POST /admin/resources/upload-image` — Upload image (admin, multipart form, field name `image`)

## Image upload

Requires a Supabase Storage bucket named `resource-images` with public read access. Create it in the Supabase dashboard: Storage → New bucket → name `resource-images` → Public bucket.
