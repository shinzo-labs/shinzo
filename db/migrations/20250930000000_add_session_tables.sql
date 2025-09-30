-- migrate:up
-- Migration: Add sessions and session_events tables
-- Created: 2025-09-30
-- Description: Add tables for session replay and detailed session histories

-- Create sessions table
CREATE TABLE IF NOT EXISTS open_telemetry.session (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_uuid UUID NOT NULL REFERENCES main.user(uuid) ON DELETE CASCADE,
    resource_uuid UUID NOT NULL REFERENCES open_telemetry.resource(uuid) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL UNIQUE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'error')),
    error_message TEXT,
    total_events INTEGER NOT NULL DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create session_events table
CREATE TABLE IF NOT EXISTS open_telemetry.session_event (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_uuid UUID NOT NULL REFERENCES open_telemetry.session(uuid) ON DELETE CASCADE,
    timestamp TIMESTAMP NOT NULL,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('tool_call', 'tool_response', 'error', 'user_input', 'system_message')),
    tool_name VARCHAR(255),
    input_data JSONB,
    output_data JSONB,
    error_data JSONB,
    duration_ms INTEGER,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for sessions
CREATE INDEX IF NOT EXISTS idx_sessions_user_uuid ON open_telemetry.session(user_uuid);
CREATE INDEX IF NOT EXISTS idx_sessions_resource_uuid ON open_telemetry.session(resource_uuid);
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON open_telemetry.session(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON open_telemetry.session(start_time);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON open_telemetry.session(status);

-- Create indexes for session_events
CREATE INDEX IF NOT EXISTS idx_session_events_session_uuid ON open_telemetry.session_event(session_uuid);
CREATE INDEX IF NOT EXISTS idx_session_events_timestamp ON open_telemetry.session_event(timestamp);
CREATE INDEX IF NOT EXISTS idx_session_events_event_type ON open_telemetry.session_event(event_type);
CREATE INDEX IF NOT EXISTS idx_session_events_tool_name ON open_telemetry.session_event(tool_name);

-- Add comments
COMMENT ON TABLE open_telemetry.session IS 'Stores session metadata for MCP server interactions';
COMMENT ON TABLE open_telemetry.session_event IS 'Stores individual events within a session for replay and analysis';
COMMENT ON COLUMN open_telemetry.session.session_id IS 'Unique identifier for the session from the SDK';
COMMENT ON COLUMN open_telemetry.session.status IS 'Current status of the session: active, completed, or error';
COMMENT ON COLUMN open_telemetry.session_event.event_type IS 'Type of event: tool_call, tool_response, error, user_input, or system_message';

-- migrate:down
DROP TABLE IF EXISTS open_telemetry.session_event CASCADE;
DROP TABLE IF EXISTS open_telemetry.session CASCADE;
