-- Adds a role snapshot to bug_attachments so QA reproduction screenshots
-- and Developer fix/dismissal screenshots can be shown in separate
-- sections. Snapshotting the uploader's role at upload time (not deriving
-- it live from users.role) follows the same pattern as
-- bug_assignment_log.severity_at_assignment and
-- test_executions.*_snapshot: a later change to someone's role must never
-- retroactively reclassify what they uploaded in the past.
--
-- Also adds bugs.dev_notes for the "Developer Notes & Blockers" field --
-- deliberately separate from steps_to_reproduce, which stays QA-owned.
--
-- Run this once against the existing database.

begin;

alter table bug_attachments
  add column uploaded_by_role text;

-- backfill existing rows from the uploader's current role, since there's
-- no better historical source for anything uploaded before this column
-- existed
update bug_attachments ba
set uploaded_by_role = u.role
from users u
where u.id = ba.uploaded_by and ba.uploaded_by_role is null;

alter table bugs
  add column dev_notes text;

commit;
