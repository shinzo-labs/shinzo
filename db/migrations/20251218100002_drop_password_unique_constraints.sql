-- migrate:up

-- Drop unique constraints on password fields to allow multiple OAuth users with null passwords
alter table main.user drop constraint if exists user_password_hash_key;
alter table main.user drop constraint if exists user_password_salt_key;

-- migrate:down

-- Restore unique constraints (only safe if no duplicate nulls exist)
alter table main.user add constraint user_password_hash_key unique (password_hash);
alter table main.user add constraint user_password_salt_key unique (password_salt);
