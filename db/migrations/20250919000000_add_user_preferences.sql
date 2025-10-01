-- migrate:up

-- Create user_preferences table
create table main.user_preferences (
    uuid uuid primary key default gen_random_uuid(),
    created_at timestamp not null default CURRENT_TIMESTAMP,
    updated_at timestamp not null default CURRENT_TIMESTAMP,
    user_uuid uuid not null references main.user(uuid),
    preference_key text not null,
    preference_value jsonb not null,
    unique(user_uuid, preference_key)
);

create trigger updated_at_user_preferences
before update on main.user_preferences
for each row execute procedure updated_at();

-- Add index for performance
create index idx_user_preferences_user_key on main.user_preferences(user_uuid, preference_key);

-- migrate:down

-- Drop user_preferences table
drop table if exists main.user_preferences;
