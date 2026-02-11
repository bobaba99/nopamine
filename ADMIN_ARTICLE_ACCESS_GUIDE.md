# Admin Article Access Guide

This guide explains how to access the admin editor and create, edit, publish, unpublish, and delete articles.

## 1) Prerequisites

- Supabase local stack is running.
- Web app dependencies are installed.
- API app dependencies are installed.
- Your account email is listed as an admin email.

## 2) Configure Environment Variables

### `apps/web/.env`

Set these values:

```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<your_anon_key>
VITE_OPENAI_API_KEY=<optional_for_verdict_features>
VITE_API_BASE_URL=http://localhost:3000
VITE_ADMIN_EMAILS=admin1@example.com,admin2@example.com
```

### `apps/api/.env`

Set these values:

```bash
PORT=3000
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>
ADMIN_EMAILS=admin1@example.com,admin2@example.com
CORS_ORIGINS=http://localhost:5173
RESOURCES_IMAGE_BUCKET=resource-images
```

## 3) Start Required Services

From repo root:

```bash
# terminal 1
npm run dev:api

# terminal 2
npm run dev:web
```

Optional health check:

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{"status":"ok"}
```

## 4) Sign In as Admin

1. Open the web app (`http://localhost:5173`).
2. Sign in with an email included in both:
   - `VITE_ADMIN_EMAILS` (frontend visibility)
   - `ADMIN_EMAILS` (backend authorization)
3. Click the **Admin** nav item.
4. Open `/admin/resources`.

If the Admin tab is missing, your signed-in email is not in `VITE_ADMIN_EMAILS`.

## 5) Create or Edit an Article

In **Admin Article Editor**:

- **New article**: click **New article** and fill form fields.
- **Edit article**: click **Edit** on an existing card.

Required fields:

- Slug
- Title
- Summary
- Body content (rich editor)

Recommended fields:

- Category
- Reading time
- Tags
- Canonical URL
- Cover image URL
- CTA URL

Click **Save** to create/update the article as a draft.

## 6) Publish and Unpublish

- Click **Publish** to make article publicly visible in `/resources`.
- Click **Unpublish** to hide it from public listing.

Publishing sets `is_published=true` and `published_at` timestamp.

## 7) Delete an Article

1. Open article in editor.
2. Click **Delete**.
3. Confirm the dialog.

Deletion is permanent and removes the row from `resources`.

## 8) Upload Images in Editor

Use the image button in the rich text toolbar.

Allowed formats:

- PNG
- JPEG
- GIF

Uploads are stored in Supabase Storage bucket `resource-images`.

If upload fails, ensure bucket exists and is publicly readable.

## 9) Common Troubleshooting

### "Failed to fetch"

Usually means API is not reachable.

Check:

- `apps/api` is running on `3000`
- `VITE_API_BASE_URL=http://localhost:3000`
- CORS origin includes `http://localhost:5173`

### "Admin access required"

Your email is not in backend `ADMIN_EMAILS`.

### "Missing or invalid Authorization header"

Session expired or request sent without token. Sign out and sign in again.

### "Cannot DELETE /admin/resources/:id" (404)

API process is outdated or route not loaded. Restart `apps/api`.

### No articles shown in Admin list

Check API logs for Supabase credentials and auth errors, then verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

## 10) Verification Checklist

- [ ] Admin tab visible after sign in
- [ ] Can save draft article
- [ ] Can publish and see article in `/resources`
- [ ] Can unpublish and hide article from `/resources`
- [ ] Can delete article
- [ ] Image upload works in editor
