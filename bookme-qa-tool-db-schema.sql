-- Bookme.pk QA Tool Pilot -- Postgres schema (for Neon)
-- Run this against a fresh Neon database to create all tables.

create table users (
  id serial primary key,
  firebase_uid text unique,
  email text unique not null,
  role text not null default 'Pending' check (role in ('Pending', 'Admin', 'QA Lead', 'Tester', 'Developer')),
  active boolean default false,
  created_at timestamptz default now()
);
-- new users land here as role='Pending', active=false on first Google login
-- an Admin assigns a real role + module(s) via user_modules, then flips active=true
-- manually promote the very first user to Admin after they sign in once, e.g.:
-- update users set role = 'Admin', active = true where email = 'you@bookme.pk';
-- emails are lowercased at the application layer before insert/lookup, so
-- 'John@bookme.pk' and 'john@bookme.pk' always resolve to the same user
-- this index is a DB-level safety net in case the app ever forgets to lowercase
create unique index users_email_lower_idx on users (lower(email));

create table modules (
  id serial primary key,
  name text unique not null,
  created_by integer references users(id),
  created_at timestamptz default now()
);
-- DB-level safety net so 'Payments' and 'payments' can't both exist as separate modules
create unique index modules_name_lower_idx on modules (lower(name));

-- a user can be scoped to more than one module, e.g. a QA Lead covering payments and search
create table user_modules (
  user_id integer references users(id) on delete cascade,
  module_id integer references modules(id) on delete cascade,
  primary key (user_id, module_id)
);

create table requirements (
  id serial primary key,
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
  title text not null,
  module_id integer not null references modules(id),
  steps text,
  expected_result text,
  priority text check (priority in ('High', 'Medium', 'Low')),
  type text not null default 'Manual',
  created_by integer references users(id),
  last_modified_by integer references users(id),
  last_modified_at timestamptz default now(),
  created_at timestamptz default now()
);

create table requirement_test_case_links (
  requirement_id integer references requirements(id) on delete cascade,
  test_case_id integer references test_cases(id) on delete cascade,
  primary key (requirement_id, test_case_id)
);

create table releases (
  id serial primary key,
  version text unique not null,
  release_date date,
  regression_status text default 'Not Started' check (regression_status in ('Not Started', 'In Progress', 'Passed', 'Failed')),
  created_at timestamptz default now()
);

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
  notes text,
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
