-- migrate:up

-- Make api_key_uuid nullable in session table to support x-shinzo-api-key auth mode
-- where provider keys are not stored in the database
ALTER TABLE spotlight.session ALTER COLUMN api_key_uuid DROP NOT NULL;

-- Make api_key_uuid nullable in interaction table for the same reason
ALTER TABLE spotlight.interaction ALTER COLUMN api_key_uuid DROP NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN spotlight.session.api_key_uuid IS 'Foreign key to provider_key table. Null when using x-shinzo-api-key header with direct provider key auth.';
COMMENT ON COLUMN spotlight.interaction.api_key_uuid IS 'Foreign key to provider_key table. Null when using x-shinzo-api-key header with direct provider key auth.';

-- migrate:down

-- Revert to NOT NULL constraints
-- Note: This will fail if there are any NULL values in the columns
ALTER TABLE spotlight.interaction ALTER COLUMN api_key_uuid SET NOT NULL;
ALTER TABLE spotlight.session ALTER COLUMN api_key_uuid SET NOT NULL;
