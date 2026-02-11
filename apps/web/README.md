# Web App (`apps/web`)

## Run

```bash
npm --workspace apps/web run dev
```

## Environment

Set these in `apps/web/.env`:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_OPENAI_API_KEY=
VITE_API_BASE_URL=http://localhost:3000
VITE_ADMIN_EMAILS=admin1@example.com,admin2@example.com
```

## Admin article editor

The admin editor is available at `/admin/resources` for signed-in users whose email is listed in `VITE_ADMIN_EMAILS`.

- Rich text formatting: bold, italic, underline, strikethrough, font size, lists, links
- Image upload: PNG/JPEG/GIF (via API upload endpoint)
- Actions: create, edit, save, publish, unpublish, delete

The page calls service-role-backed API routes in `apps/api`, so you must also run API with admin env configured.

## Quick usage

1. Start API (`apps/api`) and web (`apps/web`).
2. Sign in with an admin email.
3. Open `/admin/resources`.
4. Create or edit article content.
5. Use the image button in toolbar to upload and insert images.
6. Save draft, then publish when ready.
