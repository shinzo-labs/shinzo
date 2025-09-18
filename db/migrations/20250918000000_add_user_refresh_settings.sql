-- migrate:up
-- Add auto-refresh settings to user table
alter table main.user add column auto_refresh_enabled boolean default false;
alter table main.user add column auto_refresh_interval_seconds integer default null;

-- Update the trigger to handle new columns
create or replace function updated_at() returns trigger
language plpgsql
as
$$
begin
    NEW.updated_at = CURRENT_TIMESTAMP;
    return NEW;
end;
$$;

-- migrate:down
alter table main.user drop column if exists auto_refresh_enabled;
alter table main.user drop column if exists auto_refresh_interval_seconds;