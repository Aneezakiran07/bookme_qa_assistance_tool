-- Adds bugs.expected_result, what should have happened. It is owned by the
-- bug itself and editable by QA roles. Bugs logged from a failed test case
-- start with a copy of that test case's expected result, bugs logged
-- without a test case start empty and the reporter fills it in.
--
-- The update below backfills existing bugs that already have a linked test
-- case so they show that test case's expected result after this change.
--
-- Run this once against the existing database before deploying the code.

begin;

alter table bugs
  add column expected_result text;

update bugs b
set expected_result = tc.expected_result
from test_cases tc
where tc.id = b.linked_test_case_id
  and b.expected_result is null;

commit;
