-- Removes the "regression status" workflow from releases.
-- release_id is intentionally kept on test_executions, bugs, and
-- test_case_release_links, since releases are still used to group test
-- runs and bugs by version. Only the rigid regression_status field goes.
--
-- Run this once against the existing database.

begin;

alter table releases
  drop column if exists regression_status;

commit;
