-- migrate:up

-- First, identify and close duplicate active sessions
-- Keep the oldest session for each (user_uuid, shinzo_api_key_uuid, session_id) group
-- and mark the newer ones as ended
WITH duplicates AS (
  SELECT
    uuid,
    ROW_NUMBER() OVER (
      PARTITION BY user_uuid, shinzo_api_key_uuid, session_id
      ORDER BY created_at ASC
    ) as rn
  FROM spotlight.session
  WHERE end_time IS NULL
)
UPDATE spotlight.session
SET end_time = CURRENT_TIMESTAMP
WHERE uuid IN (
  SELECT uuid FROM duplicates WHERE rn > 1
);

-- Add a partial unique index to prevent duplicate active sessions
-- This ensures that for any combination of (user_uuid, shinzo_api_key_uuid, session_id),
-- only one session with end_time IS NULL can exist at a time
create unique index idx_session_active_unique
on spotlight.session(user_uuid, shinzo_api_key_uuid, session_id)
where end_time is null;

-- Add index for common query patterns
create index idx_session_lookup
on spotlight.session(user_uuid, shinzo_api_key_uuid, session_id, end_time);

-- migrate:down

-- Drop the unique index
drop index if exists spotlight.idx_session_active_unique;

-- Drop the lookup index
drop index if exists spotlight.idx_session_lookup;
