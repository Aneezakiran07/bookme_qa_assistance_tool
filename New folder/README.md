# Bookme QA Tool Pilot

## Step 1: install

```
npm install
```

## Step 2: Neon (database)

1. Go to https://neon.tech, sign up free, create a new project (any region close to you).
2. Open the SQL editor for that project and paste in the full contents of
   `bookme-qa-tool-db-schema.sql`, then run it. This creates every table, index, and trigger.
3. In the Neon dashboard, copy the pooled connection string (looks like
   `postgresql://user:pass@ep-xxxx-pooler.region.aws.neon.tech/dbname?sslmode=require`).
4. Set it as `DATABASE_URL` in your `.env` file.
5. After your first login (see Firebase Auth below), promote yourself to Admin by running
   this once in the Neon SQL editor, using your own email:
   ```sql
   update users set role = 'Admin', active = true where email = 'you@example.com';
   ```

## Step 3: Cloudinary (file storage)

1. Go to https://cloudinary.com, sign up free (the free tier covers a pilot's worth of
   screenshots/videos).
2. On your Cloudinary dashboard home page, copy the Cloud Name, API Key, and API Secret.
3. Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` in `.env`.
4. Nothing else to configure. Uploads go through `server/api/bugs/attachments.post.ts`,
   which uploads server-side using the API secret, so the secret never reaches the browser.
   Images are auto-resized to a 1920px max width and converted to WebP on upload to
   conserve free-tier storage/bandwidth. Video length is capped in the uploader UI
   (30-60 seconds) rather than transcoded server-side.

## Step 4: Firebase Auth (Google sign-in)

1. Go to https://console.firebase.google.com, create a project (any region/plan, the
   Spark free plan is enough).
2. In Authentication > Sign-in method, enable the Google provider. Do not restrict it to
   any Workspace domain, any Google account should be able to sign in.
3. In Project Settings > General, scroll to "Your apps", add a Web app, and copy its
   config values into the public env vars:
   - `NUXT_PUBLIC_FIREBASE_API_KEY`
   - `NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NUXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NUXT_PUBLIC_FIREBASE_APP_ID`
4. In Project Settings > Service Accounts, click "Generate new private key". This downloads
   a JSON file. From it, set:
   - `FIREBASE_PROJECT_ID` (`project_id`)
   - `FIREBASE_CLIENT_EMAIL` (`client_email`)
   - `FIREBASE_PRIVATE_KEY` (`private_key`, keep the `\n` sequences as-is, the app converts
     them back to real newlines)
5. Generate a random 32+ character string for `NUXT_SESSION_PASSWORD` (this encrypts the
   app's own session cookie, separate from Firebase), e.g. `openssl rand -hex 32`.

How sign-in works end to end: the browser signs the user in with Firebase (Google popup),
gets a Firebase ID token, and posts it to `POST /api/auth/session`. That route verifies the
token with `firebase-admin`, runs the same onboarding rule as before (new email becomes
`role=Pending`, `active=false`), and sets the app's own session cookie.

## What's built so far

- Firebase Google sign-in with no domain restriction
- First-login onboarding: new emails are created as `role=Pending`, `active=false`
- `/pending-approval` screen shown until an admin approves the user
- `/admin/pending-users` screen where an Admin assigns a role and one or more modules,
  then activates the account
- Inline module creation (`POST /api/modules`), open to any active user, not admin-gated
- Server-side middleware (`server/middleware/requireApprovedUser.ts`) blocking every API
  route except the auth and session-check routes until a user is active
- Cloudinary attachment upload endpoint for bug screenshots/videos (resize + WebP for
  images, client-side duration cap for video)

## Next steps (not built yet)

- Requirements + Test Cases modules (with the many-to-many link and the "no Done without
  a linked test case" rule)
- Test Execution (append-only) + Bugs CRUD and status lifecycle (attachments endpoint is
  ready, the rest of the Bugs module isn't)
- Releases + Dashboard (using `dashboard_daily_metrics`)
- The end-of-day digest job (Vercel Cron hitting a `CRON_SECRET`-protected route)

