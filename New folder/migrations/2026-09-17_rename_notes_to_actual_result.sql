-- Renames test_executions.notes to actual_result -- "Notes (optional)" was
-- being used to record what actually happened during a run, so name it
-- for what it is. test_executions is append-only (see
-- prevent_execution_modify trigger) but that only blocks row UPDATE/DELETE,
-- not this column-level DDL, so this is safe to run as-is.
--
-- Run this once against the existing database.

begin;

alter table test_executions
  rename column notes to actual_result;

commit;
