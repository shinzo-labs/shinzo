-- migrate:up

-- Add auth_type column to track whether interaction uses API key or subscription-based access
ALTER TABLE spotlight.interaction
ADD COLUMN auth_type TEXT CHECK (auth_type IN ('api_key', 'subscription', 'unknown'));

-- Add index for analytics queries
CREATE INDEX idx_interaction_auth_type ON spotlight.interaction(auth_type);

-- Add comment for documentation
COMMENT ON COLUMN spotlight.interaction.auth_type IS 'Type of authentication used: api_key (sk-ant-api03-...), subscription (sk-ant-oat0-...), or unknown';

-- migrate:down

DROP INDEX IF EXISTS spotlight.idx_interaction_auth_type;
ALTER TABLE spotlight.interaction DROP COLUMN IF EXISTS auth_type;
