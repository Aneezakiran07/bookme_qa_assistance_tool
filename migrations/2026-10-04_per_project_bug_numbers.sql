-- per project bug numbers and a QA comments field
-- safe to run more than once

ALTER TABLE projects ADD COLUMN IF NOT EXISTS bug_counter integer NOT NULL DEFAULT 0;
ALTER TABLE bugs ADD COLUMN IF NOT EXISTS bug_number integer;
ALTER TABLE bugs ADD COLUMN IF NOT EXISTS qa_comments text;

-- number any bugs that already exist, per project, oldest first
UPDATE bugs b
SET bug_number = n.rn
FROM (
  SELECT id, row_number() OVER (PARTITION BY project_id ORDER BY id) AS rn
  FROM bugs
) n
WHERE b.id = n.id AND b.bug_number IS NULL;

-- bring each project counter up to its highest number
UPDATE projects p
SET bug_counter = COALESCE((SELECT max(bug_number) FROM bugs WHERE project_id = p.id), 0);

ALTER TABLE bugs ALTER COLUMN bug_number SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS bugs_project_bug_number_key ON bugs (project_id, bug_number);
