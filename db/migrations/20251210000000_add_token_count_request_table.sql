-- migrate:up

-- Token count requests table for tracking token counting operations
CREATE TABLE spotlight.token_count_request (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- User and authentication tracking
    user_uuid UUID NOT NULL REFERENCES main."user"(uuid),
    api_key_uuid UUID REFERENCES spotlight.provider_key(uuid),
    shinzo_api_key_uuid UUID NOT NULL REFERENCES spotlight.shinzo_api_key(uuid),

    -- Request metadata
    request_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    model TEXT NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('anthropic', 'openai', 'google')),

    -- Token counting parameters
    has_system_prompt BOOLEAN DEFAULT false,
    has_tools BOOLEAN DEFAULT false,
    message_count INTEGER NOT NULL,

    -- Response metadata
    response_timestamp TIMESTAMP,
    latency_ms INTEGER,
    input_tokens INTEGER,

    -- Full request/response as JSONB
    request_data JSONB NOT NULL,
    response_data JSONB,

    -- Error tracking
    error_message TEXT,
    error_type TEXT,
    auth_type TEXT CHECK (auth_type IN ('api_key', 'subscription', 'unknown')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'error'))
);

-- Index for querying by user and time
CREATE INDEX idx_token_count_request_user_timestamp
    ON spotlight.token_count_request(user_uuid, request_timestamp DESC);

-- Index for querying by Shinzo API key
CREATE INDEX idx_token_count_request_shinzo_key
    ON spotlight.token_count_request(shinzo_api_key_uuid);

-- Index for analytics by provider
CREATE INDEX idx_token_count_request_provider
    ON spotlight.token_count_request(provider, request_timestamp DESC);

-- Index for status monitoring
CREATE INDEX idx_token_count_request_status
    ON spotlight.token_count_request(status, request_timestamp DESC);

-- migrate:down

DROP TABLE IF EXISTS spotlight.token_count_request CASCADE;
