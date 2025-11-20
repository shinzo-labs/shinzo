-- migrate:up

-- Create table for Shinzo-generated API keys
CREATE TABLE spotlight.shinzo_api_key (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_uuid UUID NOT NULL REFERENCES main."user"(uuid),

    -- Key identification
    key_name TEXT NOT NULL,
    api_key TEXT NOT NULL UNIQUE,
    key_prefix TEXT NOT NULL, -- First 12 chars for display (sk_shinzo_...)

    -- Key metadata
    key_type TEXT NOT NULL DEFAULT 'live' CHECK (key_type IN ('live', 'test')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'revoked')),
    last_used TIMESTAMP,

    -- Permissions and scoping (for future use)
    scopes JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create table for encrypted provider API keys
CREATE TABLE spotlight.provider_key (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_uuid UUID NOT NULL REFERENCES main."user"(uuid),

    -- Provider information
    provider TEXT NOT NULL CHECK (provider IN ('anthropic', 'openai', 'google', 'custom')),
    provider_base_url TEXT,
    label TEXT, -- User-friendly label (e.g., "Production", "Testing")

    -- Encrypted key storage
    encrypted_key TEXT NOT NULL, -- AES-256-GCM encrypted
    key_prefix TEXT NOT NULL, -- First 7-10 chars for display (sk-ant-...)
    encryption_iv TEXT NOT NULL, -- Initialization vector for decryption

    -- Key metadata
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'revoked')),
    last_used TIMESTAMP,
    last_validated TIMESTAMP,

    UNIQUE(user_uuid, provider, label)
);

-- Update foreign keys in dependent tables to reference shinzo_api_key
-- First, add the new column
ALTER TABLE spotlight.session ADD COLUMN shinzo_api_key_uuid UUID REFERENCES spotlight.shinzo_api_key(uuid);
ALTER TABLE spotlight.interaction ADD COLUMN shinzo_api_key_uuid UUID REFERENCES spotlight.shinzo_api_key(uuid);

-- Create indexes for performance
CREATE INDEX idx_shinzo_api_key_user ON spotlight.shinzo_api_key(user_uuid);
CREATE INDEX idx_shinzo_api_key_status ON spotlight.shinzo_api_key(status);
CREATE INDEX idx_shinzo_api_key_type ON spotlight.shinzo_api_key(key_type);
CREATE INDEX idx_shinzo_api_key_last_used ON spotlight.shinzo_api_key(last_used);

CREATE INDEX idx_provider_key_user ON spotlight.provider_key(user_uuid);
CREATE INDEX idx_provider_key_provider ON spotlight.provider_key(provider);
CREATE INDEX idx_provider_key_status ON spotlight.provider_key(status);
CREATE INDEX idx_provider_key_last_used ON spotlight.provider_key(last_used);

-- Add triggers for updated_at
CREATE TRIGGER updated_at_shinzo_api_key
    BEFORE UPDATE ON spotlight.shinzo_api_key
    FOR EACH ROW EXECUTE FUNCTION public.updated_at();

CREATE TRIGGER updated_at_provider_key
    BEFORE UPDATE ON spotlight.provider_key
    FOR EACH ROW EXECUTE FUNCTION public.updated_at();

-- Note: We keep the old api_key table for now to avoid breaking existing data
-- It will be deprecated and removed in a future migration after data migration

-- migrate:down

DROP TRIGGER IF EXISTS updated_at_provider_key ON spotlight.provider_key;
DROP TRIGGER IF EXISTS updated_at_shinzo_api_key ON spotlight.shinzo_api_key;

DROP INDEX IF EXISTS spotlight.idx_provider_key_last_used;
DROP INDEX IF EXISTS spotlight.idx_provider_key_status;
DROP INDEX IF EXISTS spotlight.idx_provider_key_provider;
DROP INDEX IF EXISTS spotlight.idx_provider_key_user;

DROP INDEX IF EXISTS spotlight.idx_shinzo_api_key_last_used;
DROP INDEX IF EXISTS spotlight.idx_shinzo_api_key_type;
DROP INDEX IF EXISTS spotlight.idx_shinzo_api_key_status;
DROP INDEX IF EXISTS spotlight.idx_shinzo_api_key_user;

ALTER TABLE spotlight.interaction DROP COLUMN IF EXISTS shinzo_api_key_uuid;
ALTER TABLE spotlight.session DROP COLUMN IF EXISTS shinzo_api_key_uuid;

DROP TABLE IF EXISTS spotlight.provider_key;
DROP TABLE IF EXISTS spotlight.shinzo_api_key;
