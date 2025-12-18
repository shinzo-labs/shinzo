-- migrate:up

-- Add OAuth fields to user table
alter table main.user
  add column oauth_provider text,
  add column oauth_id text,
  add column oauth_profile_data jsonb;

-- Make password fields nullable for OAuth users
alter table main.user
  alter column password_hash drop not null,
  alter column password_salt drop not null;

-- Add unique constraint for OAuth provider + ID combination
create unique index idx_user_oauth_provider_id on main.user(oauth_provider, oauth_id) where oauth_provider is not null and oauth_id is not null;

-- migrate:down

-- Remove OAuth fields from user table
alter table main.user
  drop column if exists oauth_provider,
  drop column if exists oauth_id,
  drop column if exists oauth_profile_data;

-- Restore not null constraints on password fields
alter table main.user
  alter column password_hash set not null,
  alter column password_salt set not null;

-- Drop unique constraint
drop index if exists main.idx_user_oauth_provider_id;
