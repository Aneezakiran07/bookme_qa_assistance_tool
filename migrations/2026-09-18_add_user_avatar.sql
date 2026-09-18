-- Adds the column backing the profile page's avatar picker. avatar_id is
-- just a short string key into a fixed, app-defined set of SVG avatars
-- (see app/utils/avatarOptions.ts) -- never raw SVG or a file path, so
-- there is nothing here for a user to inject and nothing to migrate if
-- the art itself changes later.
--
-- Defaults every existing and new user to 'fox' so nobody ends up with
-- a blank avatar before they've picked one for themselves.
--
-- Run this once against the existing database.

begin;

alter table users
  add column avatar_id text not null default 'fox';

commit;
