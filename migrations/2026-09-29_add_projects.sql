-- Project scoping: every piece of QA data now belongs to exactly one project.
-- The database only holds users at this point, so there is no backfill step
-- and the new project_id columns can be not null straight away.

begin;

create table projects (
  id serial primary key,
  name text not null,
  slug text not null unique,
  description text,
  created_by integer references users(id),
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index projects_name_lower_idx on projects (lower(name)) where archived = false;

alter table modules      add column project_id integer not null references projects(id);
alter table releases     add column project_id integer not null references projects(id);
alter table requirements add column project_id integer not null references projects(id);
alter table test_cases   add column project_id integer not null references projects(id);
alter table bugs         add column project_id integer not null references projects(id);

-- names and versions are now unique per project instead of globally
drop index if exists modules_name_lower_idx;
create unique index modules_project_name_lower_idx
  on modules (project_id, lower(name)) where archived = false;

alter table releases drop constraint if exists releases_version_key;
alter table releases add constraint releases_project_version_key unique (project_id, version);

-- targets for the composite foreign keys that block cross project references
alter table modules    add constraint modules_id_project_key    unique (id, project_id);
alter table releases   add constraint releases_id_project_key   unique (id, project_id);
alter table test_cases add constraint test_cases_id_project_key unique (id, project_id);

alter table requirements add constraint requirements_module_project_fk
  foreign key (module_id, project_id) references modules (id, project_id);
alter table test_cases add constraint test_cases_module_project_fk
  foreign key (module_id, project_id) references modules (id, project_id);
alter table bugs add constraint bugs_module_project_fk
  foreign key (module_id, project_id) references modules (id, project_id);
alter table bugs add constraint bugs_release_project_fk
  foreign key (release_id, project_id) references releases (id, project_id);
alter table bugs add constraint bugs_test_case_project_fk
  foreign key (linked_test_case_id, project_id) references test_cases (id, project_id);

-- indexes for project scoped list queries
create index idx_releases_project     on releases (project_id, created_at desc);
create index idx_requirements_project on requirements (project_id, module_id) where archived = false;
create index idx_test_cases_project   on test_cases (project_id, module_id) where archived = false;
create index idx_bugs_project_status  on bugs (project_id, status) where archived = false;
create index idx_bugs_project_release on bugs (project_id, release_id);

-- the invite migration removed Pending from the role check, so the old default is no longer valid
alter table users alter column role drop default;

commit;
