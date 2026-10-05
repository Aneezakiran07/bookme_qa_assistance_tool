-- Bookme.pk QA Tool Pilot -- Postgres schema (for Neon)
-- Run this against a fresh Neon database to create all tables.
-- Projects were added on top of the flat structure, see migrations/2026-09-29_add_projects.sql.
-- Every piece of QA data belongs to exactly one project, only users and invitations stay global.

create table users (
  id serial primary key,
  firebase_uid text unique,
  email text unique not null,
  role text not null check (role in ('Admin', 'QA Lead', 'Tester', 'Developer')),
  active boolean default false,
  created_at timestamptz default now(),
  display_name text,
  email_notifications boolean not null default true,
  daily_digest_enabled boolean not null default true,
  avatar_id text not null default 'cat',
  invited_by integer references users(id),
  invited_at timestamptz,
  password_hash text,
  last_login_at timestamptz,
  failed_login_attempts integer not null default 0,
  locked_until timestamptz
);
-- there is no Pending role anymore, people join through an invitation with a role already set
-- new users land here as role='Pending', active=false on first Google login
-- an Admin assigns a real role + module(s) via user_modules, then flips active=true
-- manually promote the very first user to Admin after they sign in once, e.g.:
-- update users set role = 'Admin', active = true where email = 'you@bookme.pk';
-- emails are lowercased at the application layer before insert/lookup, so
-- 'John@bookme.pk' and 'john@bookme.pk' always resolve to the same user
-- this index is a DB-level safety net in case the app ever forgets to lowercase
create unique index users_email_lower_idx on users (lower(email));

-- a project is a product or initiative, the slug is generated once by the server and never changes
create table projects (
  id serial primary key,
  name text not null,
  slug text not null unique,
  description text,
  created_by integer references users(id),
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index projects_name_lower_idx on projects (lower(name)) where archived = false;

create table modules (
  id serial primary key,
  project_id integer not null references projects(id),
  name text not null,
  created_by integer references users(id),
  created_at timestamptz default now(),
  archived boolean not null default false  -- soft delete: "Delete" flips this instead of removing
                                            -- the row. requirements.module_id / test_cases.module_id
                                            -- are `not null references modules(id)` with no cascade,
                                            -- so once anything (even an archived, historical row) has
                                            -- ever pointed at a module, a real hard delete becomes
                                            -- impossible anyway -- soft delete here sidesteps that
                                            -- for good instead of special-casing it per caller.
);
-- DB-level safety net so 'Payments' and 'payments' can't both exist as
-- separate ACTIVE modules. Partial (archived = false) so an archived
-- module's name frees up for reuse instead of squatting on it forever.
-- the name is unique per project, so two projects can each have a Payments module
create unique index modules_project_name_lower_idx on modules (project_id, lower(name)) where archived = false;
-- older migration notes for a database from before projects existed:
-- alter table modules add column archived boolean not null default false;
-- alter table modules drop constraint modules_name_key; -- drops the old plain-unique(name) constraint
-- drop index modules_name_lower_idx;
-- create unique index modules_name_lower_idx on modules (lower(name)) where archived = false;

-- a user can be scoped to more than one module, e.g. a QA Lead covering payments and search
create table user_modules (
  user_id integer references users(id) on delete cascade,
  module_id integer references modules(id) on delete cascade,
  primary key (user_id, module_id)
);

create table requirements (
  id serial primary key,
  project_id integer not null references projects(id),
  title text not null,
  module_id integer not null references modules(id),
  target_release text,
  status text not null default 'Draft' check (status in ('Draft', 'Approved', 'In Testing', 'Done')),
  description text,
  created_by integer references users(id),
  created_at timestamptz default now(),
  archived boolean default false
);

create table test_cases (
  id serial primary key,
  project_id integer not null references projects(id),
  title text not null,
  module_id integer not null references modules(id),
  steps text,
  expected_result text,
  priority text check (priority in ('High', 'Medium', 'Low')),
  type text not null default 'Manual',
  created_by integer references users(id),
  last_modified_by integer references users(id),
  last_modified_at timestamptz default now(),
  created_at timestamptz default now(),
  archived boolean not null default false  -- soft delete: "Delete" flips this instead of removing
                                            -- the row, since test_executions.test_case_id is
                                            -- `on delete restrict` and would 500 on a hard delete
                                            -- once a test case has any execution history
);
-- migration for an already-deployed db:
-- alter table test_cases add column archived boolean not null default false;
-- create index idx_test_cases_archived on test_cases(archived);

create table requirement_test_case_links (
  requirement_id integer references requirements(id) on delete cascade,
  test_case_id integer references test_cases(id) on delete cascade,
  primary key (requirement_id, test_case_id)
);

create table releases (
  id serial primary key,
  project_id integer not null references projects(id),
  version text not null,
  release_date date,
  created_at timestamptz default now(),
  constraint releases_project_version_key unique (project_id, version)
);
-- regression_status was removed: releases are now just a grouping label
-- for test runs and bugs (a version and a date), with no dedicated
-- regression workflow attached to them

-- which test cases belong to which release's regression suite (many to
-- many: a test case can be assigned to any number of releases). the
-- execution workspace for a release only shows test cases linked here.
create table test_case_release_links (
  test_case_id integer not null references test_cases(id) on delete cascade,
  release_id integer not null references releases(id) on delete cascade,
  primary key (test_case_id, release_id)
);

create index idx_test_case_release_links_release on test_case_release_links(release_id);

-- if releases/test_cases already existed in your database from before
-- this table and the snapshot columns below were added, run once instead:
-- create table test_case_release_links (
--   test_case_id integer not null references test_cases(id) on delete cascade,
--   release_id integer not null references releases(id) on delete cascade,
--   primary key (test_case_id, release_id)
-- );
-- create index idx_test_case_release_links_release on test_case_release_links(release_id);
-- alter table test_executions add column test_case_title_snapshot text;
-- alter table test_executions add column steps_snapshot text;
-- alter table test_executions add column expected_result_snapshot text;

create table test_executions (
  id serial primary key,
  test_case_id integer not null references test_cases(id) on delete restrict,
  release_id integer not null references releases(id) on delete restrict,
  result text not null check (result in ('Pass', 'Fail', 'Blocked', 'Not Run')),
  executed_by integer not null references users(id),
  execution_date timestamptz default now(),
  actual_result text,
  -- captured at execution time so a later edit to the test case never
  -- retroactively changes what a past run recorded against
  test_case_title_snapshot text,
  steps_snapshot text,
  expected_result_snapshot text
);

-- enforces "append-only" at the DB level: once an execution record is
-- written, it can never be updated or deleted, only new rows added
create or replace function prevent_execution_modify()
returns trigger as $$
begin
  raise exception 'test_executions is append-only: updates and deletes are not allowed';
end;
$$ language plpgsql;

create trigger test_executions_no_update
before update or delete on test_executions
for each row execute function prevent_execution_modify();

create table bugs (
  id serial primary key,
  project_id integer not null references projects(id),
  title text not null,
  module_id integer not null references modules(id),
  severity text not null check (severity in ('Critical', 'High', 'Medium', 'Low')),
  priority text check (priority in ('High', 'Medium', 'Low')),
  status text not null default 'Open' check (status in ('Open', 'In Progress', 'Fixed', 'Retest', 'Closed', 'Reopened')),
  owner_id integer references users(id),
  environment_build text,
  linked_test_case_id integer references test_cases(id),
  release_id integer references releases(id),  -- nullable: exploratory bugs found outside a specific release cycle won't have one
  steps_to_reproduce text,
  actual_result text,
  expected_result text,
  dev_notes text,  -- implementation notes, environment quirks, or status-decision context; kept
                    -- separate from steps_to_reproduce, which stays QA-owned
  reported_by integer references users(id),
  reported_at timestamptz default now(),
  last_status_change_at timestamptz default now(),
  archived boolean not null default false  -- soft delete: "Delete Bug" flips this instead of removing the row,
                                            -- so attachments, assignment log, and status history are never lost
);

-- if bugs already exists in your database from before this column was
-- added, run this once instead of recreating the table:
-- alter table bugs add column archived boolean not null default false;

-- one row per uploaded file, so a bug can have any number of screenshots/videos (1NF: atomic values)
create table bug_attachments (
  id serial primary key,
  bug_id integer not null references bugs(id) on delete cascade,
  file_url text not null,   -- Cloudinary secure delivery URL
  public_id text,           -- Cloudinary asset id, used to destroy() the asset on delete
  file_type text check (file_type in ('image', 'video')),
  uploaded_by integer not null references users(id),
  -- snapshot of the uploader's role at upload time (not derived live from
  -- users.role) so a later role change never retroactively reclassifies
  -- what someone uploaded in the past
  uploaded_by_role text,
  uploaded_at timestamptz default now()
);

create table bug_assignment_log (
  id serial primary key,
  bug_id integer not null references bugs(id) on delete cascade,
  assigned_to integer not null references users(id),
  assigned_by integer references users(id),
  assigned_at timestamptz default now(),
  severity_at_assignment text
);

-- tracks every status transition on a bug, needed to answer historical
-- questions like "how many Critical bugs were open during the last 30 days"
-- since bugs.status only reflects the current state
create table bug_status_history (
  id serial primary key,
  bug_id integer not null references bugs(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_by integer references users(id),
  changed_at timestamptz default now()
);

-- records what notifications have already been sent, so the daily job
-- doesn't double-send a critical alert or a digest to the same user twice
create table notification_log (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  type text not null check (type in ('critical_assignment', 'daily_digest')),
  sent_at timestamptz default now(),
  payload jsonb
);

-- Indexes for common filters (module, status, severity, date range)
create index idx_bugs_module on bugs(module_id);
create index idx_bugs_status on bugs(status);
create index idx_bugs_severity on bugs(severity);
create index idx_bugs_owner on bugs(owner_id);
create index idx_bugs_release on bugs(release_id);
create index idx_bugs_archived on bugs(archived);
create index idx_bug_attachments_bug on bug_attachments(bug_id);
create index idx_test_cases_module on test_cases(module_id);
create index idx_test_cases_archived on test_cases(archived);
create index idx_executions_test_case on test_executions(test_case_id);
create index idx_executions_release on test_executions(release_id);
create index idx_executions_date on test_executions(execution_date);
create index idx_requirements_module on requirements(module_id);
create index idx_bug_status_history_bug on bug_status_history(bug_id);
create index idx_notification_log_user on notification_log(user_id);
create index idx_notification_log_sent_at on notification_log(sent_at);
create index idx_bug_assignment_log_bug on bug_assignment_log(bug_id);

-- ============================================================
-- Dashboard: daily aggregate table (supports the 7D/14D/30D/All Time filter)
--
-- Materialized views were tried first but don't work here: they aggregate
-- ALL data at refresh time with no date dimension, so you can't slice them
-- by "last 7 days" after the fact. This table stores one row per day per
-- module per release, written by a nightly (or hourly) scheduled job.
-- The dashboard then SUMs/AVGs over whatever range the user picks.
--
-- Definition used for "open Critical/High count" in a date range:
-- this stores a DAILY SNAPSHOT (how many Critical/High bugs were open at
-- the moment the job ran that day), not a full reconstruction of every
-- second a bug was open. For "7D", the dashboard shows the average or
-- latest snapshot across those 7 daily rows. This is a simplification we
-- chose deliberately for V1 -- reconstructing exact open-time per bug from
-- bug_status_history is possible later if the team needs that precision,
-- but daily snapshots are enough to show a meaningful trend for a pilot.
-- ============================================================

create table dashboard_daily_metrics (
  id serial primary key,
  metric_date date not null,
  module_id integer references modules(id),  -- NULL = "all modules" summary row
  release_id integer references releases(id),  -- NULL = "all releases" summary row
  total_requirements integer default 0,
  covered_requirements integer default 0,
  total_executions integer default 0,
  passed_executions integer default 0,
  total_test_cases integer default 0,
  automated_test_cases integer default 0,
  open_bugs integer default 0,
  open_critical_high integer default 0
);

-- a plain PK on (metric_date, module_id, release_id) would implicitly force
-- module_id/release_id to NOT NULL, which blocks writing "all modules" or
-- "all releases" summary rows. coalesce() here treats NULL as a normal
-- value for uniqueness purposes, so both per-module and overall rows can
-- coexist for the same day without clashing.
create unique index dashboard_daily_metrics_uniq
  on dashboard_daily_metrics (
    metric_date,
    coalesce(module_id, -1),
    coalesce(release_id, -1)
  );

create index idx_dashboard_daily_metrics_date on dashboard_daily_metrics(metric_date);
create index idx_dashboard_daily_metrics_module on dashboard_daily_metrics(module_id);

-- total_executions / passed_executions are DAILY DELTAS -- SUM them across
-- the selected date range to get a period total, then compute pass rate
-- from those sums.
-- everything else (total_requirements, covered_requirements,
-- total_test_cases, automated_test_cases, open_bugs, open_critical_high)
-- is a DAILY SNAPSHOT -- do NOT sum these across a range. Use the LATEST
-- row in the range, or AVG across the range if a trend average is wanted.
-- Summing a snapshot metric across days will silently multiply the real
-- number and produce a wrong dashboard figure.

-- Example: how the dashboard queries this for a "last 7 days" pass rate
-- select sum(passed_executions)::numeric / nullif(sum(total_executions), 0) as pass_rate
-- from dashboard_daily_metrics
-- where metric_date >= current_date - interval '7 days';

-- ============================================================
-- Invitations: people join by invitation only
-- ============================================================
create table invitations (
  id serial primary key,
  email text not null,
  role text not null check (role in ('Admin', 'QA Lead', 'Tester', 'Developer')),
  token text unique not null,
  invited_by integer references users(id),
  created_at timestamptz default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz
);
-- only one outstanding invite per email at a time
create unique index invitations_email_active_idx
  on invitations (lower(email))
  where accepted_at is null and revoked_at is null;
create index idx_invitations_token on invitations(token);

-- ============================================================
-- Project scoping
--
-- project_id lives on modules, releases, requirements, test_cases and bugs.
-- test_executions has no project_id, it is scoped through release_id.
-- The link tables and the bug attachment, history and assignment tables have
-- no project_id either, their project comes from their parent row.
--
-- The composite foreign keys below make the database reject a row that points
-- at a module, release or test case from a different project. They are skipped
-- by Postgres when the nullable column is null, which is what bugs.release_id
-- and bugs.linked_test_case_id need.
-- ============================================================
alter table modules    add constraint modules_id_project_key    unique (id, project_id);
alter table releases   add constraint releases_id_project_key   unique (id, project_id);
alter table test_cases add constraint test_cases_id_project_key unique (id, project_id);

alter table requirements add constraint requirements_module_project_fk
  foreign key (module_id, project_id) references modules (id, project_id);
alter table test_cases add constraint test_cases_module_project_fk
  foreign key (module_id, project_id) references modules (id, project_id);
alter table bugs add constraint bugs_module_project_fk
  foreign key (module_id, project_id) references modules (id, project_id);
alter table bugs add constraint bugs_release_project_fk
  foreign key (release_id, project_id) references releases (id, project_id);
alter table bugs add constraint bugs_test_case_project_fk
  foreign key (linked_test_case_id, project_id) references test_cases (id, project_id);

create index idx_releases_project     on releases (project_id, created_at desc);
create index idx_requirements_project on requirements (project_id, module_id) where archived = false;
create index idx_test_cases_project   on test_cases (project_id, module_id) where archived = false;
create index idx_bugs_project_status  on bugs (project_id, status) where archived = false;
create index idx_bugs_project_release on bugs (project_id, release_id);

create index idx_users_last_login_at on users (last_login_at);

-- password reset requests, kept separate from invitations on purpose
create table password_resets (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);
create index idx_password_resets_user on password_resets (user_id);
