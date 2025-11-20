-- migrate:up

-- Update the foreign key constraint for session.api_key_uuid to reference provider_key instead of api_key
ALTER TABLE spotlight.session 
    DROP CONSTRAINT IF EXISTS session_api_key_uuid_fkey;

ALTER TABLE spotlight.session 
    ADD CONSTRAINT session_api_key_uuid_fkey 
    FOREIGN KEY (api_key_uuid) REFERENCES spotlight.provider_key(uuid);

-- Also update the interaction table's api_key_uuid constraint
ALTER TABLE spotlight.interaction 
    DROP CONSTRAINT IF EXISTS interaction_api_key_uuid_fkey;

ALTER TABLE spotlight.interaction 
    ADD CONSTRAINT interaction_api_key_uuid_fkey 
    FOREIGN KEY (api_key_uuid) REFERENCES spotlight.provider_key(uuid);

-- migrate:down

-- Revert back to the old api_key table reference
ALTER TABLE spotlight.interaction 
    DROP CONSTRAINT IF EXISTS interaction_api_key_uuid_fkey;

ALTER TABLE spotlight.interaction 
    ADD CONSTRAINT interaction_api_key_uuid_fkey 
    FOREIGN KEY (api_key_uuid) REFERENCES spotlight.api_key(uuid);

ALTER TABLE spotlight.session 
    DROP CONSTRAINT IF EXISTS session_api_key_uuid_fkey;

ALTER TABLE spotlight.session 
    ADD CONSTRAINT session_api_key_uuid_fkey 
    FOREIGN KEY (api_key_uuid) REFERENCES spotlight.api_key(uuid);
