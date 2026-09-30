# Bookme QA Tool

A web app for the Bookme QA team. It tracks requirements, test cases, test runs, releases and bugs. Everything lives inside a project. Access is by invite only.

## What it does

- Keeps QA data in separate projects.
- Links requirements to test cases.
- Groups test cases into releases.
- Records test runs and never rewrites them.
- Logs bugs with screenshots and videos.
- Assigns bugs to developers and emails them.
- Shows dashboards for QA and for developers.
- Sends a daily email digest.

## Tech stack

| Part | Tool |
| --- | --- |
| Framework | Nuxt 4 (Vue 3, TypeScript) |
| UI | PrimeVue 4, Tailwind CSS |
| Database | Neon (serverless Postgres) |
| Sign-in | Firebase Auth (Google and email/password) |
| App session | `nuxt-auth-utils` (encrypted cookie) |
| File storage | Cloudinary |
| Email | OneSignal |
| Hosting and cron | Vercel |

## Roles

There are four roles.

| Role | What they can do |
| --- | --- |
| Admin | Everything. |
| QA Lead | Same power as Admin for managing people, projects and modules. |
| Tester | Works with requirements, test cases, executions and bugs. |
| Developer | Works on bugs only. Gets a focused dashboard and a Bugs Directory. |

Only Admin and QA Lead can:

- Invite, revoke, change the role of, or deactivate users.
- Create and edit projects.
- Rename and delete modules.

Other rules:

- Any active user can create a module, a requirement, a test case, a release and a bug.
- Developers cannot open Test Cases or Executions. They are sent back to the dashboard.
- Steps to reproduce, actual result and expected result on a bug can only be edited by Admin, QA Lead and Tester.
- Dev notes on a bug can only be edited by Developer and Admin.
- These rules are enforced on the server too, not only in the UI.

## Getting started

You need Node.js 20 or newer.

### 1. Install

```
npm install
```

### 2. Set up the database (Neon)

1. Create a project at https://neon.tech.
2. Open the SQL editor.
3. Paste in all of `bookme-qa-tool-db-schema.sql` and run it.
4. Copy the pooled connection string.
5. Put it in `.env` as `DATABASE_URL`.

The schema file is always the full, current schema. Use it for a fresh database.

### 3. Set up Firebase

1. Create a project at https://console.firebase.google.com.
2. Turn on the Google provider and the Email/Password provider.
3. Do not limit Google to one Workspace domain. The app limits access by invite instead.
4. Add your deployed domain under Authentication > Settings > Authorized domains.
5. Add a Web app in Project Settings. Copy its config into the `NUXT_PUBLIC_FIREBASE_*` variables.
6. In Service Accounts, generate a private key. Copy `project_id`, `client_email` and `private_key` into the `FIREBASE_*` variables. Keep the `\n` characters in the key as they are.
7. Make a random secret for `NUXT_SESSION_PASSWORD`. It must be 32 characters or more. For example: `openssl rand -hex 32`.

### 4. Set up Cloudinary

1. Create an account at https://cloudinary.com.
2. Copy the Cloud Name, API Key and API Secret.
3. Put them in `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET`.

Nothing else is needed. Uploads go through the server, so the secret never reaches the browser.

### 5. Set up OneSignal

1. Create an app at https://onesignal.com with the email channel on.
2. Put the App ID in `ONESIGNAL_APP_ID`.
3. Put the REST API key in `ONESIGNAL_REST_API_KEY`.

OneSignal sends the "bug assigned to you" email and the daily digest. Check the payload in `server/utils/email.ts` against the current OneSignal docs before you rely on it in production.

### 6. Fill in the other variables

- `APP_URL`: the full URL of the site. It is used to build links in emails.
- `CRON_SECRET`: any long random string. It protects the cron route.

### 7. Create the first Admin

Signup is closed, so the very first user must be added by hand. Run this once in the Neon SQL editor. Use your own email in lowercase.

```sql
insert into users (email, role, active)
values ('you@example.com', 'Admin', true);
```

Then open the app and sign in with Google using that email. The app links your Firebase account to the row on first login.

### 8. Run it

```
npm run dev
```

Other scripts:

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the dev server. |
| `npm run build` | Builds for production. |
| `npm run preview` | Previews the production build. |

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon connection string. |
| `APP_URL` | Public URL of the site. |
| `CRON_SECRET` | Secret for the cron route. |
| `NUXT_SESSION_PASSWORD` | Encrypts the session cookie. |
| `ONESIGNAL_APP_ID` | OneSignal app id. |
| `ONESIGNAL_REST_API_KEY` | OneSignal REST key. |
| `FIREBASE_PROJECT_ID` | Firebase Admin project id. Read at build time. |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin client email. Read at build time. |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin private key. Read at build time. |
| `NUXT_FIREBASE_ADMIN_PROJECT_ID` | Same as above. Use on Vercel. |
| `NUXT_FIREBASE_ADMIN_CLIENT_EMAIL` | Same as above. Use on Vercel. |
| `NUXT_FIREBASE_ADMIN_PRIVATE_KEY` | Same as above. Use on Vercel. |
| `NUXT_PUBLIC_FIREBASE_API_KEY` | Firebase web config. Safe in the browser. |
| `NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase web config. |
| `NUXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase web config. |
| `NUXT_PUBLIC_FIREBASE_APP_ID` | Firebase web config. |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account name. |
| `CLOUDINARY_API_KEY` | Cloudinary key. |
| `CLOUDINARY_API_SECRET` | Cloudinary secret. |

On Vercel, set the `NUXT_FIREBASE_ADMIN_*` versions. Nuxt reads them on every request. You do not need to rebuild after changing them.

## How sign-in works

1. The browser signs the user in with Firebase.
2. Firebase gives the browser an ID token.
3. The browser posts the token to `POST /api/auth/session`.
4. The server checks the token with `firebase-admin`.
5. The server looks the person up in the `users` table.
6. If all is well, the server sets its own session cookie.

The login is refused with a 403 when:

- The email has no `users` row and no live invitation.
- The account is deactivated.
- The Firebase email is not verified.
- The row is already linked to a different Firebase account.

On every request the server re-reads the user. If the user was deactivated or deleted, the cookie is cleared. If the role changed, the cookie is updated. So role changes apply without a new login.

## How invites work

1. An Admin or QA Lead opens **Team & Invites** (`/admin/users`).
2. They enter an email and a role.
3. The server creates a Firebase user with no password.
4. The server saves an `invitations` row. The token lasts 7 days.
5. Firebase emails the invitee a password-setup link.
6. The invitee sets a password, then signs in with it or with Google.
7. On the first verified login, the app creates the `users` row.
8. The Continue button on Firebase's page opens `/accept-invite`. It finishes the same setup, but it is optional.

An invite can be revoked. A revoked invite blocks login for that email. The same email cannot have two live invites.

## Projects

Every piece of QA data belongs to exactly one project. That covers modules, releases, requirements, test cases and bugs.

- Pages live under `/projects/<slug>/...`.
- Old top-level links, such as `/bugs`, redirect into your last used project.
- The home page opens your last used project. If you have none, it opens the project list.
- The browser sends the project id in an `x-project-id` header on every API call.
- The server trusts that header only. A project id in a request body is ignored.
- The slug is made by the server from the name. It cannot be chosen.
- Names are unique per project. Release versions are unique per project.
- An archived project is read only. Writes return 403 until it is unarchived.
- Composite foreign keys in the database stop records from pointing across projects.

## Features

### Modules

- Modules group requirements and test cases.
- Any active user can create one.
- Admin and QA Lead can rename or delete one.
- Delete is a soft delete. A module with active requirements or test cases cannot be deleted.

### Requirements

- Statuses: Draft, Approved, In Testing, Done.
- Each requirement belongs to a module.
- A requirement can link to many test cases, and a test case to many requirements.

### Test cases

- Fields: title, steps, expected result, priority, type (Manual by default), module.
- A test case can be duplicated.
- Delete is a soft delete. This keeps run history and links safe.

### Releases

- A release has a version and an optional date.
- Each release has a scoped test suite. This is the set of test cases planned for it.
- The suite is saved in one call. The server replaces the whole set.
- Every test case in a suite must belong to the same project.

### Test executions

- A run has a result: Pass, Fail, Blocked or Not Run.
- A run needs a test case and a release.
- The test case must be in that release's suite.
- Runs are append-only. You add new ones. You do not edit old ones.
- Each run stores a snapshot of the test case title, steps and expected result. Later edits to the test case do not change past runs.

### Bugs

- Bugs show as `BUG-001`, `BUG-002` and so on.
- Severity: Critical, High, Medium, Low.
- Priority: High, Medium, Low.
- Status: Open, In Progress, Fixed, Retest, Closed, Reopened.
- Any status can move to any other status. There is no fixed lifecycle.
- Every status change is saved in `bug_status_history`.
- Every assignment is saved in `bug_assignment_log`, with the severity at that moment.
- When a bug is assigned to someone, they get an email. If the email fails, the assignment still succeeds.
- A bug can link to a module, a release and a test case.
- Delete is a soft delete.
- The Developer view lists bugs in two scopes: `mine` and `team`. It can filter by period: all, day, week, month.

### Attachments

- A bug can have images and videos.
- Images are resized to 1920px wide and converted to WebP.
- Videos are stored as uploaded. Their length is capped in the uploader, not on the server.
- Files go to the `bookme-qa-bugs` folder in Cloudinary.
- Each attachment records who uploaded it and their role.

### Dashboards

- QA and Admin see project-wide numbers and trends. Ranges: 7 days, 14 days, 30 days, all time.
- Developers see their own open bugs, blockers, pending items and resolved items.
- The projects page shows totals across all projects.

### Profile

- Each user can set a display name, an avatar, and email preferences.
- They can turn the daily digest on or off.
- The page also shows a live preview of the digest.

### Theme

- Dark mode is the default. There is a light mode too.
- The choice is saved in the browser.

## Daily digest

- `vercel.json` runs `/api/cron/daily-digest` at `0 0 * * *`. That is 00:00 UTC, which is 05:00 in Karachi.
- The route needs `CRON_SECRET`. Send it as `Authorization: Bearer <secret>` or as `?secret=<secret>`.
- Developers get their own bug numbers and a short list of open bugs.
- Admins get a project-wide summary.
- QA Lead and Tester do not get the digest.
- People with nothing open and nothing new are skipped.
- The digest reads across all projects. Each bug shows its project name.

Dates like "today" and "this week" use the Asia/Karachi time zone (UTC+5). The server's own time zone does not matter.

## Database

The main tables:

| Table | What it holds |
| --- | --- |
| `users` | People, roles, Firebase uid, preferences. |
| `invitations` | Invites, with token, expiry, accepted and revoked times. |
| `projects` | Projects and their slugs. |
| `modules` | Modules per project. |
| `requirements` | Requirements per project. |
| `test_cases` | Test cases per project. |
| `requirement_test_case_links` | Requirement to test case links. |
| `releases` | Releases per project. |
| `test_case_release_links` | Which test cases are in which release. |
| `test_executions` | Test runs, with snapshots. |
| `bugs` | Bugs per project. |
| `bug_attachments` | Bug images and videos. |
| `bug_status_history` | Every status change. |
| `bug_assignment_log` | Every assignment. |
| `notification_log` | Record of emails sent. |
| `dashboard_daily_metrics` | Daily metric snapshots. |

### Migrations

The `migrations/` folder holds the changes made over time. Their names start with a date.

- For a new database, run only the schema file.
- For an old database, run the migrations you are missing, in date order.
- There is no migration runner. Run them by hand in the Neon SQL editor.

## Project layout

```
app/
  components/   shared UI (ui/, form/, layout/, dashboard/)
  composables/  project list, sidebar, theme helpers
  layouts/      default and auth layouts
  middleware/   auth, project context, role and redirect guards
  pages/        routes (projects/[slug]/... holds the main pages)
  plugins/      Firebase, PrimeVue services, x-project-id header
  utils/        small client helpers
server/
  api/          API routes, one folder per feature
  db/           database client
  middleware/   session sync and API sign-in guard
  repositories/ all SQL lives here, one file per table group
  services/     login and onboarding rules
  utils/        role check, project check, cron auth, email, Cloudinary, Karachi dates
migrations/     dated SQL changes
```

Some conventions:

- Routes stay thin. SQL lives in the repositories.
- Every route that touches project data calls `requireProject`.
- Every route that needs a role calls `requireRole`.
- Components have flat names. `components/ui/BaseButton.vue` is `<BaseButton />`.

## Server guards

Two server middlewares run on every API call.

1. `00-syncSession.ts` refreshes the session from the database.
2. `requireApprovedUser.ts` blocks anyone who is not signed in and active.

These routes are public:

- `/api/auth/session`
- `/api/_auth/session`
- `/api/me`
- `/api/invitations/validate`
- `/api/invitations/accept-google`
- `/api/invitations/finalize`
- `/api/cron/` (each cron route checks the secret itself)

## Deploying to Vercel

1. Push the repo and import it in Vercel.
2. Add all environment variables. Use the `NUXT_FIREBASE_ADMIN_*` names for Firebase Admin.
3. Set `APP_URL` to the live URL.
4. Add the live domain to Firebase Authorized domains.
5. Deploy. Vercel picks up the cron job from `vercel.json`.

## Known gaps

- The rule "a requirement cannot be Done without a linked test case" is not enforced yet.
- The `dashboard_daily_metrics` table exists, but the server code does not use it. Dashboards read live data.
- The "bug assigned" email links to `/bugs/<id>`. This works through the old-link redirect, and it depends on your last used project.
- Video length is only limited in the browser.