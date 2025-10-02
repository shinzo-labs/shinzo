-- migrate:up

-- Create subscription_tier table
create table main.subscription_tier (
    uuid uuid primary key default gen_random_uuid(),
    created_at timestamp not null default CURRENT_TIMESTAMP,
    updated_at timestamp not null default CURRENT_TIMESTAMP,
    tier text not null unique check (tier in ('free', 'growth', 'scale')),
    monthly_quota integer
);

create trigger updated_at_subscription_tier
before update on main.subscription_tier
for each row execute procedure updated_at();

-- Insert default subscription tiers
insert into main.subscription_tier (tier, monthly_quota) values
    ('free', 2000),
    ('growth', 10000),
    ('scale', null);

-- Add quota tracking columns to user table
alter table main.user add column monthly_counter integer not null default 0;
alter table main.user add column last_counter_reset timestamp not null default CURRENT_TIMESTAMP;
alter table main.user add column subscription_tier_uuid uuid references main.subscription_tier(uuid);
alter table main.user add column subscribed_on timestamp;

-- Set default subscription tier to 'free' for existing users
update main.user set subscription_tier_uuid = (
    select uuid from main.subscription_tier where tier = 'free'
);

-- Make subscription_tier_uuid not null after setting defaults
alter table main.user alter column subscription_tier_uuid set not null;

-- Add indexes for performance
create index idx_user_subscription_tier on main.user(subscription_tier_uuid);
create index idx_user_last_counter_reset on main.user(last_counter_reset);

-- migrate:down

-- Remove columns from user table
alter table main.user drop column if exists monthly_counter;
alter table main.user drop column if exists last_counter_reset;
alter table main.user drop column if exists subscription_tier_uuid;
alter table main.user drop column if exists subscribed_on;

-- Drop subscription_tier table
drop table if exists main.subscription_tier;