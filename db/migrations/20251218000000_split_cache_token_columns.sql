-- migrate:up

-- Add new cache token columns to session table
ALTER TABLE spotlight.session
ADD COLUMN total_cache_creation_ephemeral_5m_input_tokens INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN total_cache_creation_ephemeral_1h_input_tokens INTEGER DEFAULT 0 NOT NULL;

-- Update existing total_cached_tokens data to 5m column (best effort migration)
-- Note: We can't split existing data perfectly, so we'll assume all cache creation was 5m
UPDATE spotlight.session
SET total_cache_creation_ephemeral_5m_input_tokens = total_cached_tokens
WHERE total_cached_tokens > 0;

-- Drop the old total_cached_tokens column
ALTER TABLE spotlight.session
DROP COLUMN total_cached_tokens;

-- Add new cache token columns to interaction table
ALTER TABLE spotlight.interaction
ADD COLUMN cache_creation_ephemeral_5m_input_tokens INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN cache_creation_ephemeral_1h_input_tokens INTEGER DEFAULT 0 NOT NULL;

-- Update existing cache_creation_input_tokens data to 5m column (best effort migration)
-- Note: We can't split existing data perfectly, so we'll assume all cache creation was 5m
UPDATE spotlight.interaction
SET cache_creation_ephemeral_5m_input_tokens = cache_creation_input_tokens
WHERE cache_creation_input_tokens > 0;

-- Drop the old cache_creation_input_tokens column
ALTER TABLE spotlight.interaction
DROP COLUMN cache_creation_input_tokens;

-- migrate:down

-- Restore cache_creation_input_tokens column to interaction table
ALTER TABLE spotlight.interaction
ADD COLUMN cache_creation_input_tokens INTEGER DEFAULT 0 NOT NULL;

-- Restore data from 5m and 1h columns (sum them)
UPDATE spotlight.interaction
SET cache_creation_input_tokens = cache_creation_ephemeral_5m_input_tokens + cache_creation_ephemeral_1h_input_tokens;

-- Drop the new columns
ALTER TABLE spotlight.interaction
DROP COLUMN cache_creation_ephemeral_1h_input_tokens,
DROP COLUMN cache_creation_ephemeral_5m_input_tokens;

-- Restore total_cached_tokens column to session table
ALTER TABLE spotlight.session
ADD COLUMN total_cached_tokens INTEGER DEFAULT 0 NOT NULL;

-- Restore data from 5m and 1h columns (sum them)
UPDATE spotlight.session
SET total_cached_tokens = total_cache_creation_ephemeral_5m_input_tokens + total_cache_creation_ephemeral_1h_input_tokens;

-- Drop the new columns
ALTER TABLE spotlight.session
DROP COLUMN total_cache_creation_ephemeral_1h_input_tokens,
DROP COLUMN total_cache_creation_ephemeral_5m_input_tokens;
