-- migrate:up

-- Create user_survey table for onboarding questionnaire responses
create table main.user_survey (
    uuid uuid primary key default gen_random_uuid(),
    created_at timestamp not null default CURRENT_TIMESTAMP,
    updated_at timestamp not null default CURRENT_TIMESTAMP,
    user_uuid uuid not null references main.user(uuid) unique,
    usage_types text[] not null, -- e.g., ['ai-agent', 'mcp-server']
    role text, -- e.g., 'software-engineer', 'engineering-manager'
    referral_sources text[] -- e.g., ['reddit', 'linkedin', 'x']
);

create trigger updated_at_user_survey
before update on main.user_survey
for each row execute procedure updated_at();

-- Add index for performance
create index idx_user_survey_user_uuid on main.user_survey(user_uuid);

-- migrate:down

-- Drop user_survey table
drop table if exists main.user_survey;
