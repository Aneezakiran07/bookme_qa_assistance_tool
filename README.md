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
| Sign-in | Email and password, checked on the server with bcrypt |
| App session | `nuxt-auth-utils` (encrypted cookie) |
| File storage | Cloudinary |
| Email | AWS SES |
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

### 3. Session secret

Make a random secret for `NUXT_SESSION_PASSWORD`. It must be 32 characters or more. For example: `openssl rand -hex 32`.

If you are upgrading from the Firebase version, run `migrations/2026-10-02_email_password_auth.sql` in the Neon SQL editor first. It is safe to run twice.

To start with a clean database and one Admin, edit and run `migrations/2026-10-03_wipe_data_and_seed_admin.sql`. It deletes all data.

### 4. Set up Cloudinary

1. Create an account at https://cloudinary.com.
2. Copy the Cloud Name, API Key and API Secret.
3. Put them in `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET`.

Nothing else is needed. Uploads go through the server, so the secret never reaches the browser.

### 5. Set up AWS SES

1. Verify the sender address or domain in AWS SES.
2. Put the AWS region in `SES_AWS_REGION`.
3. Put the access key pair in `SES_AWS_ACCESS_KEY_ID` and `SES_AWS_SECRET_ACCESS_KEY`.

AWS SES sends invite emails, password reset emails, the "bug assigned to you" email and the daily digest.

Set `SES_AWS_REGION`, `SES_AWS_ACCESS_KEY_ID`, `SES_AWS_SECRET_ACCESS_KEY`, `SES_FROM_EMAIL` and `SES_FROM_NAME`. The sender address or its domain must be verified in SES. New SES accounts start in sandbox mode, where mail only reaches verified recipients until AWS grants production access. Until `SES_AWS_ACCESS_KEY_ID` is set, emails are printed to the server console when not in production.

### 6. Fill in the other variables

- `APP_URL`: the full URL of the site. It is used to build links in emails.
- `CRON_SECRET`: any long random string. It protects the cron route.

### 7. Create the first Admin

Signup is closed, so the very first user must be added by hand. Run this once in the Neon SQL editor. Use your own email in lowercase.

```sql
insert into users (email, role, active)
values ('you@example.com', 'Admin', true);
```

Then give that account a password. This needs `DATABASE_URL` in your environment:

```
node scripts/set-password.mjs you@example.com
```

The script asks for the password without showing it. Then sign in with email and password.

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
| `SES_AWS_REGION` | AWS region of your SES setup. |
| `SES_AWS_ACCESS_KEY_ID` | AWS access key for sending. |
| `SES_AWS_SECRET_ACCESS_KEY` | AWS secret key for sending. |
| `SES_FROM_EMAIL` | Verified sender address. |
| `SES_FROM_NAME` | Sender display name. |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account name. |
| `CLOUDINARY_API_KEY` | Cloudinary key. |
| `CLOUDINARY_API_SECRET` | Cloudinary secret. |

## How sign-in works

1. The person enters email and password on `/login`.
2. The browser posts them to `POST /api/auth/session`.
3. The server looks the user up and checks the password with bcrypt.
4. If all is well, the server sets its own session cookie.

Sign-in fails when the email or password is wrong (401, same message for both), the account is locked (429), or the account is deactivated (403). After 5 wrong passwords in a row the account is locked for 15 minutes.

On every request the server re-reads the user. If the user was deactivated or deleted, the cookie is cleared. If the role changed, the cookie is updated. So role changes apply without a new login. A password reset does not end sessions that already exist.

## Forgot password

1. The person asks for a reset on `/forgot-password`. The answer is always the same, whether or not the email has an account.
2. If an active user exists, the server stores a hashed one time token in `password_resets` and emails a link. The link lasts 1 hour. At most 3 resets are made per user per hour.
3. The link opens `/reset-password`, where the person sets a new password. The link works once.

## How invites work

1. An Admin or QA Lead opens **Team & Invites** (`/admin/users`).
2. They enter an email and a role.
3. The server saves an `invitations` row. The token lasts 7 days.
4. The server emails the invitee a link to `/accept-invite`. If the email cannot be sent, the invite is kept and can be resent from the Team page.
5. The invitee sets a password. The app creates the `users` row, signs them in, and marks the invite accepted.

An invite can be revoked. The same email cannot have two live invites.

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
| `users` | People, roles, password hash, login tracking, preferences. |
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
  plugins/      PrimeVue services, x-project-id header
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
2. Add all environment variables. Include `SES_FROM_EMAIL` and `SES_FROM_NAME`.
3. Set `APP_URL` to the live URL.
5. Deploy. Vercel picks up the cron job from `vercel.json`.

## Known gaps

- The rule "a requirement cannot be Done without a linked test case" is not enforced yet.
- The `dashboard_daily_metrics` table exists, but the server code does not use it. Dashboards read live data.
- The "bug assigned" email links to `/bugs/<id>`. This works through the old-link redirect, and it depends on your last used project.
- Video length is only limited in the browser.