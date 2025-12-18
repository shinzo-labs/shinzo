-- migrate:up

-- Create session_share table for managing session sharing
CREATE TABLE spotlight.session_share (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    session_uuid UUID NOT NULL REFERENCES spotlight.session(uuid) ON DELETE CASCADE,
    user_uuid UUID NOT NULL REFERENCES main."user"(uuid),
    share_token TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMP,
    UNIQUE(session_uuid)
);

-- Create indexes for performance
CREATE INDEX idx_session_share_session ON spotlight.session_share(session_uuid);
CREATE INDEX idx_session_share_token ON spotlight.session_share(share_token);
CREATE INDEX idx_session_share_user ON spotlight.session_share(user_uuid);
CREATE INDEX idx_session_share_active ON spotlight.session_share(is_active);

-- Add trigger for updated_at
CREATE TRIGGER updated_at_session_share
    BEFORE UPDATE ON spotlight.session_share
    FOR EACH ROW EXECUTE FUNCTION public.updated_at();

-- migrate:down

DROP TRIGGER IF EXISTS updated_at_session_share ON spotlight.session_share;
DROP INDEX IF EXISTS spotlight.idx_session_share_active;
DROP INDEX IF EXISTS spotlight.idx_session_share_user;
DROP INDEX IF EXISTS spotlight.idx_session_share_token;
DROP INDEX IF EXISTS spotlight.idx_session_share_session;
DROP TABLE IF EXISTS spotlight.session_share;
