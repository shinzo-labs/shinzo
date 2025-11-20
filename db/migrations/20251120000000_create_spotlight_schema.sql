-- migrate:up

-- Create spotlight schema for AI agent analytics
CREATE SCHEMA spotlight;

-- API keys table for managing user API keys
CREATE TABLE spotlight.api_key (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_uuid UUID NOT NULL REFERENCES main."user"(uuid),
    key_name TEXT NOT NULL,
    api_key TEXT NOT NULL UNIQUE,
    provider TEXT NOT NULL CHECK (provider IN ('anthropic', 'openai', 'google', 'custom')),
    provider_api_key TEXT NOT NULL,
    provider_base_url TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    last_used TIMESTAMP
);

-- Sessions table for tracking conversation sessions
CREATE TABLE spotlight.session (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_uuid UUID NOT NULL REFERENCES main."user"(uuid),
    api_key_uuid UUID NOT NULL REFERENCES spotlight.api_key(uuid),
    session_id TEXT NOT NULL,
    start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    total_requests INTEGER DEFAULT 0,
    total_input_tokens INTEGER DEFAULT 0,
    total_output_tokens INTEGER DEFAULT 0,
    total_cached_tokens INTEGER DEFAULT 0
);

-- AI Model API interactions table
CREATE TABLE spotlight.interaction (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    session_uuid UUID NOT NULL REFERENCES spotlight.session(uuid),
    user_uuid UUID NOT NULL REFERENCES main."user"(uuid),
    api_key_uuid UUID NOT NULL REFERENCES spotlight.api_key(uuid),

    -- Request metadata
    request_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    model TEXT NOT NULL,
    provider TEXT NOT NULL,
    max_tokens INTEGER,
    temperature DOUBLE PRECISION,
    system_prompt TEXT,

    -- Response metadata
    response_timestamp TIMESTAMP,
    response_id TEXT,
    stop_reason TEXT,
    latency_ms INTEGER,

    -- Token usage
    input_tokens INTEGER,
    output_tokens INTEGER,
    cache_creation_input_tokens INTEGER DEFAULT 0,
    cache_read_input_tokens INTEGER DEFAULT 0,

    -- Request/response data stored as JSONB for flexibility
    request_data JSONB NOT NULL,
    response_data JSONB,

    -- Error tracking
    error_message TEXT,
    error_type TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'error'))
);

-- Messages table for detailed message tracking
CREATE TABLE spotlight.message (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    interaction_uuid UUID NOT NULL REFERENCES spotlight.interaction(uuid),
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    message_index INTEGER NOT NULL,
    token_count INTEGER,
    cached BOOLEAN DEFAULT false
);

-- Tools table for tracking tool definitions
CREATE TABLE spotlight.tool (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_uuid UUID NOT NULL REFERENCES main."user"(uuid),
    tool_name TEXT NOT NULL,
    description TEXT,
    input_schema JSONB,
    first_seen TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_calls INTEGER DEFAULT 0,
    total_input_tokens INTEGER DEFAULT 0,
    total_output_tokens INTEGER DEFAULT 0
);

-- Tool usage table for tracking individual tool calls
CREATE TABLE spotlight.tool_usage (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    interaction_uuid UUID NOT NULL REFERENCES spotlight.interaction(uuid),
    tool_uuid UUID NOT NULL REFERENCES spotlight.tool(uuid),
    tool_name TEXT NOT NULL,
    tool_input JSONB,
    tool_output JSONB,
    execution_time_ms INTEGER,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0
);

-- User analytics tracking
CREATE TABLE spotlight.user_analytics (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_uuid UUID NOT NULL REFERENCES main."user"(uuid),
    end_user_id TEXT NOT NULL,
    total_requests INTEGER DEFAULT 0,
    total_input_tokens INTEGER DEFAULT 0,
    total_output_tokens INTEGER DEFAULT 0,
    total_cached_tokens INTEGER DEFAULT 0,
    first_request TIMESTAMP,
    last_request TIMESTAMP,
    UNIQUE(user_uuid, end_user_id)
);

-- Create indexes for performance
CREATE INDEX idx_api_key_user ON spotlight.api_key(user_uuid);
CREATE INDEX idx_api_key_status ON spotlight.api_key(status);
CREATE INDEX idx_api_key_provider ON spotlight.api_key(provider);

CREATE INDEX idx_session_user ON spotlight.session(user_uuid);
CREATE INDEX idx_session_api_key ON spotlight.session(api_key_uuid);
CREATE INDEX idx_session_id ON spotlight.session(session_id);
CREATE INDEX idx_session_start_time ON spotlight.session(start_time);

CREATE INDEX idx_interaction_session ON spotlight.interaction(session_uuid);
CREATE INDEX idx_interaction_user ON spotlight.interaction(user_uuid);
CREATE INDEX idx_interaction_api_key ON spotlight.interaction(api_key_uuid);
CREATE INDEX idx_interaction_timestamp ON spotlight.interaction(request_timestamp);
CREATE INDEX idx_interaction_model ON spotlight.interaction(model);
CREATE INDEX idx_interaction_provider ON spotlight.interaction(provider);
CREATE INDEX idx_interaction_status ON spotlight.interaction(status);

CREATE INDEX idx_message_interaction ON spotlight.message(interaction_uuid);
CREATE INDEX idx_message_role ON spotlight.message(role);

CREATE INDEX idx_tool_user ON spotlight.tool(user_uuid);
CREATE INDEX idx_tool_name ON spotlight.tool(tool_name);
CREATE INDEX idx_tool_last_seen ON spotlight.tool(last_seen);

CREATE INDEX idx_tool_usage_interaction ON spotlight.tool_usage(interaction_uuid);
CREATE INDEX idx_tool_usage_tool ON spotlight.tool_usage(tool_uuid);
CREATE INDEX idx_tool_usage_name ON spotlight.tool_usage(tool_name);

CREATE INDEX idx_user_analytics_user ON spotlight.user_analytics(user_uuid);
CREATE INDEX idx_user_analytics_end_user ON spotlight.user_analytics(end_user_id);
CREATE INDEX idx_user_analytics_last_request ON spotlight.user_analytics(last_request);

-- Add triggers for updated_at
CREATE TRIGGER updated_at_api_key
    BEFORE UPDATE ON spotlight.api_key
    FOR EACH ROW EXECUTE FUNCTION public.updated_at();

CREATE TRIGGER updated_at_session
    BEFORE UPDATE ON spotlight.session
    FOR EACH ROW EXECUTE FUNCTION public.updated_at();

CREATE TRIGGER updated_at_interaction
    BEFORE UPDATE ON spotlight.interaction
    FOR EACH ROW EXECUTE FUNCTION public.updated_at();

CREATE TRIGGER updated_at_message
    BEFORE UPDATE ON spotlight.message
    FOR EACH ROW EXECUTE FUNCTION public.updated_at();

CREATE TRIGGER updated_at_tool
    BEFORE UPDATE ON spotlight.tool
    FOR EACH ROW EXECUTE FUNCTION public.updated_at();

CREATE TRIGGER updated_at_tool_usage
    BEFORE UPDATE ON spotlight.tool_usage
    FOR EACH ROW EXECUTE FUNCTION public.updated_at();

CREATE TRIGGER updated_at_user_analytics
    BEFORE UPDATE ON spotlight.user_analytics
    FOR EACH ROW EXECUTE FUNCTION public.updated_at();

-- migrate:down

DROP TRIGGER IF EXISTS updated_at_user_analytics ON spotlight.user_analytics;
DROP TRIGGER IF EXISTS updated_at_tool_usage ON spotlight.tool_usage;
DROP TRIGGER IF EXISTS updated_at_tool ON spotlight.tool;
DROP TRIGGER IF EXISTS updated_at_message ON spotlight.message;
DROP TRIGGER IF EXISTS updated_at_interaction ON spotlight.interaction;
DROP TRIGGER IF EXISTS updated_at_session ON spotlight.session;
DROP TRIGGER IF EXISTS updated_at_api_key ON spotlight.api_key;

DROP INDEX IF EXISTS spotlight.idx_user_analytics_last_request;
DROP INDEX IF EXISTS spotlight.idx_user_analytics_end_user;
DROP INDEX IF EXISTS spotlight.idx_user_analytics_user;
DROP INDEX IF EXISTS spotlight.idx_tool_usage_name;
DROP INDEX IF EXISTS spotlight.idx_tool_usage_tool;
DROP INDEX IF EXISTS spotlight.idx_tool_usage_interaction;
DROP INDEX IF EXISTS spotlight.idx_tool_last_seen;
DROP INDEX IF EXISTS spotlight.idx_tool_name;
DROP INDEX IF EXISTS spotlight.idx_tool_user;
DROP INDEX IF EXISTS spotlight.idx_message_role;
DROP INDEX IF EXISTS spotlight.idx_message_interaction;
DROP INDEX IF EXISTS spotlight.idx_interaction_status;
DROP INDEX IF EXISTS spotlight.idx_interaction_provider;
DROP INDEX IF EXISTS spotlight.idx_interaction_model;
DROP INDEX IF EXISTS spotlight.idx_interaction_timestamp;
DROP INDEX IF EXISTS spotlight.idx_interaction_api_key;
DROP INDEX IF EXISTS spotlight.idx_interaction_user;
DROP INDEX IF EXISTS spotlight.idx_interaction_session;
DROP INDEX IF EXISTS spotlight.idx_session_start_time;
DROP INDEX IF EXISTS spotlight.idx_session_id;
DROP INDEX IF EXISTS spotlight.idx_session_api_key;
DROP INDEX IF EXISTS spotlight.idx_session_user;
DROP INDEX IF EXISTS spotlight.idx_api_key_provider;
DROP INDEX IF EXISTS spotlight.idx_api_key_status;
DROP INDEX IF EXISTS spotlight.idx_api_key_user;

DROP TABLE IF EXISTS spotlight.user_analytics;
DROP TABLE IF EXISTS spotlight.tool_usage;
DROP TABLE IF EXISTS spotlight.tool;
DROP TABLE IF EXISTS spotlight.message;
DROP TABLE IF EXISTS spotlight.interaction;
DROP TABLE IF EXISTS spotlight.session;
DROP TABLE IF EXISTS spotlight.api_key;

DROP SCHEMA IF EXISTS spotlight;
