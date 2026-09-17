-- Adds the columns the new /profile page needs: an editable display name,
-- plus two notification preference flags a user can toggle for themselves.
-- These flags only store intent for now, nothing reads them yet. The
-- daily digest and assignment emails are wired to check them in a
-- later change, once the email sending logic itself is hooked up.
--
-- Both preference flags default to true so existing users keep getting
-- notified exactly as they do today until they opt out.
--
-- Run this once against the existing database.

begin;

alter table users
  add column display_name text,
  add column email_notifications boolean not null default true,
  add column daily_digest_enabled boolean not null default true;

commit;
