-- DESTRUCTIVE. deletes every row in every table, then creates one Admin user
-- take a Neon branch or backup first if there is any chance you need the data
--
-- users cannot be deleted alone because other tables point at them with
-- foreign keys, some of them NOT NULL, so all data is wiped together
--
-- BEFORE RUNNING: change the email in the INSERT at the bottom to the real admin email
-- files already uploaded to Cloudinary are not touched and become orphaned

BEGIN;

TRUNCATE TABLE
  bug_assignment_log,
  bug_attachments,
  bug_status_history,
  bugs,
  dashboard_daily_metrics,
  invitations,
  modules,
  notification_log,
  password_resets,
  projects,
  releases,
  requirement_test_case_links,
  requirements,
  test_case_release_links,
  test_cases,
  test_executions,
  users
RESTART IDENTITY CASCADE;

-- the first Admin, with no password yet
-- set one with scripts/set-password.mjs or use Forgot password on the login page
INSERT INTO users (email, role, active)
VALUES (lower('CHANGE_ME@example.com'), 'Admin', true);

COMMIT;
