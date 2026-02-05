-- migrate:up

-- Step 1: Create oauth_account table to support multiple OAuth providers per user
CREATE TABLE main.oauth_account (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_uuid UUID NOT NULL REFERENCES main."user"(uuid) ON DELETE CASCADE,
    oauth_provider TEXT NOT NULL,
    oauth_id TEXT NOT NULL,
    oauth_email TEXT,
    oauth_profile_data JSONB,
    linked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(oauth_provider, oauth_id)
);

-- Create indexes for efficient lookups
CREATE INDEX idx_oauth_account_user ON main.oauth_account(user_uuid);
CREATE INDEX idx_oauth_account_provider_id ON main.oauth_account(oauth_provider, oauth_id);

-- Step 2: Migrate existing OAuth data from user table to oauth_account table
INSERT INTO main.oauth_account (user_uuid, oauth_provider, oauth_id, oauth_email, oauth_profile_data, linked_at)
SELECT
    uuid AS user_uuid,
    oauth_provider,
    oauth_id,
    email AS oauth_email,
    oauth_profile_data,
    COALESCE(updated_at, created_at) AS linked_at
FROM main."user"
WHERE oauth_provider IS NOT NULL AND oauth_id IS NOT NULL;

-- Step 3: Drop OAuth columns from user table (no longer needed)
DROP INDEX IF EXISTS main.idx_user_oauth_provider_id;
ALTER TABLE main."user" DROP COLUMN IF EXISTS oauth_provider;
ALTER TABLE main."user" DROP COLUMN IF EXISTS oauth_id;
ALTER TABLE main."user" DROP COLUMN IF EXISTS oauth_profile_data;

-- migrate:down

-- Restore OAuth columns to user table
ALTER TABLE main."user"
    ADD COLUMN oauth_provider TEXT,
    ADD COLUMN oauth_id TEXT,
    ADD COLUMN oauth_profile_data JSONB;

-- Restore unique constraint
CREATE UNIQUE INDEX idx_user_oauth_provider_id ON main."user"(oauth_provider, oauth_id)
WHERE oauth_provider IS NOT NULL AND oauth_id IS NOT NULL;

-- Migrate data back to user table (only the first OAuth account per user)
UPDATE main."user" u
SET
    oauth_provider = oa.oauth_provider,
    oauth_id = oa.oauth_id,
    oauth_profile_data = oa.oauth_profile_data
FROM (
    SELECT DISTINCT ON (user_uuid)
        user_uuid,
        oauth_provider,
        oauth_id,
        oauth_profile_data
    FROM main.oauth_account
    ORDER BY user_uuid, linked_at ASC
) oa
WHERE u.uuid = oa.user_uuid;

-- Drop indexes and table
DROP INDEX IF EXISTS main.idx_oauth_account_provider_id;
DROP INDEX IF EXISTS main.idx_oauth_account_user;
DROP TABLE IF EXISTS main.oauth_account;
