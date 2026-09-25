-- Invite-only onboarding: replaces self-signup-with-approval.
-- Admin/QA Lead invites someone by email + role; the invitee sets a
-- password (or continues with Google) via a Firebase password-reset email.

ALTER TABLE users ADD COLUMN invited_by integer REFERENCES users(id);
ALTER TABLE users ADD COLUMN invited_at timestamptz;

-- no more 'Pending' role: anyone who slipped in as Pending under the old
-- self-signup flow becomes Developer so the role check below can drop it
UPDATE users SET role = 'Developer' WHERE role = 'Pending';

ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('Admin', 'QA Lead', 'Tester', 'Developer'));

CREATE TABLE invitations (
  id serial PRIMARY KEY,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('Admin', 'QA Lead', 'Tester', 'Developer')),
  token text UNIQUE NOT NULL,
  invited_by integer REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  revoked_at timestamptz
);

-- only one outstanding (not yet accepted/revoked) invite per email at a time
CREATE UNIQUE INDEX invitations_email_active_idx
  ON invitations (lower(email))
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

CREATE INDEX idx_invitations_token ON invitations(token);
