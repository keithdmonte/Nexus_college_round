-- Migration for an existing database (schema.sql already includes these for new setups).
-- Adds who-did-what (logins) and the revert PR link.
alter table patches add column if not exists created_by text;
alter table patches add column if not exists revert_pr_url text;
alter table audit_log add column if not exists actor text;
alter table audit_log drop constraint if exists audit_log_action_check;
alter table audit_log add constraint audit_log_action_check
  check (action in ('created', 'edited', 'published', 'rolled_back', 'pr_opened', 'revert_opened', 'reported_broken', 'retired'));
