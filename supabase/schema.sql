-- PATCHWORK schema. See docs/DATA_MODEL.md.
-- RLS is enabled with no policies: only the service role key (API routes) can read or write.

create table sites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  site_key text not null unique,
  preview_token text not null,
  github_repo text,
  live_version_id uuid,
  created_at timestamptz not null default now()
);

create table patches (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  name text not null,
  page text not null default '*',
  target jsonb not null,
  changes jsonb not null default '[]',
  status text not null default 'draft' check (status in ('draft', 'published', 'retired')),
  last_broken_at timestamptz,
  pr_url text,
  revert_pr_url text,
  created_by text, -- display name of the logged-in user
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table versions (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  number int not null,
  patches jsonb not null default '[]', -- frozen copy, never references patch rows
  note text,
  created_at timestamptz not null default now(),
  unique (site_id, number)
);

alter table sites
  add constraint sites_live_version_fk foreign key (live_version_id) references versions(id);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  action text not null check (action in ('created', 'edited', 'published', 'rolled_back', 'pr_opened', 'revert_opened', 'reported_broken', 'retired')),
  patch_id uuid references patches(id) on delete set null,
  version_id uuid references versions(id) on delete set null,
  details jsonb not null default '{}',
  actor text, -- who did it (display name); null for visitor reports
  created_at timestamptz not null default now()
);

create index on patches (site_id);
create index on versions (site_id);
create index on audit_log (site_id, created_at desc);

alter table sites enable row level security;
alter table patches enable row level security;
alter table versions enable row level security;
alter table audit_log enable row level security;
