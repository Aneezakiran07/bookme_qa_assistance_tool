-- Adds bugs.actual_result: what actually happened when the bug occurred,
-- QA-owned and editable, distinct from steps_to_reproduce (how to trigger
-- it) and from the linked test case's expected_result (what should have
-- happened). Also distinct from test_executions.actual_result, which is
-- the same idea but scoped to a single test run rather than a bug report.
--
-- Run this once against the existing database.

begin;

alter table bugs
  add column actual_result text;

commit;
