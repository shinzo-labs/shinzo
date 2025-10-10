-- migrate:up

-- Add missing fields to trace table
ALTER TABLE open_telemetry.trace
ADD COLUMN trace_id TEXT,
ADD COLUMN scope_name TEXT,
ADD COLUMN scope_version TEXT;

-- Add missing fields to span table
ALTER TABLE open_telemetry.span
ADD COLUMN trace_id TEXT,
ADD COLUMN span_id TEXT,
ADD COLUMN parent_span_id TEXT,
ADD COLUMN scope_name TEXT,
ADD COLUMN scope_version TEXT,
ADD COLUMN dropped_attributes_count INTEGER DEFAULT 0,
ADD COLUMN dropped_events_count INTEGER DEFAULT 0,
ADD COLUMN dropped_links_count INTEGER DEFAULT 0;

-- Create span_event table for storing span events
CREATE TABLE open_telemetry.span_event (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    span_uuid UUID NOT NULL REFERENCES open_telemetry.span(uuid),
    name TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    dropped_attributes_count INTEGER DEFAULT 0
);

-- Create span_event_attribute table for storing event attributes
CREATE TABLE open_telemetry.span_event_attribute (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    span_event_uuid UUID NOT NULL REFERENCES open_telemetry.span_event(uuid),
    key TEXT NOT NULL,
    value_type TEXT NOT NULL CHECK (value_type IN ('string', 'int', 'double', 'bool', 'array')),
    string_value TEXT,
    int_value INTEGER,
    double_value DOUBLE PRECISION,
    bool_value BOOLEAN,
    array_value JSONB
);

-- Create span_link table for storing span links
CREATE TABLE open_telemetry.span_link (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    span_uuid UUID NOT NULL REFERENCES open_telemetry.span(uuid),
    trace_id TEXT NOT NULL,
    span_id TEXT NOT NULL,
    trace_state TEXT,
    dropped_attributes_count INTEGER DEFAULT 0
);

-- Create span_link_attribute table for storing link attributes
CREATE TABLE open_telemetry.span_link_attribute (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    span_link_uuid UUID NOT NULL REFERENCES open_telemetry.span_link(uuid),
    key TEXT NOT NULL,
    value_type TEXT NOT NULL CHECK (value_type IN ('string', 'int', 'double', 'bool', 'array')),
    string_value TEXT,
    int_value INTEGER,
    double_value DOUBLE PRECISION,
    bool_value BOOLEAN,
    array_value JSONB
);

-- Add missing fields to metric table
ALTER TABLE open_telemetry.metric
ADD COLUMN start_timestamp TIMESTAMP,
ADD COLUMN aggregation_temporality INTEGER,
ADD COLUMN is_monotonic BOOLEAN,
ADD COLUMN min_value DOUBLE PRECISION,
ADD COLUMN max_value DOUBLE PRECISION,
ADD COLUMN count BIGINT,
ADD COLUMN sum_value DOUBLE PRECISION;

-- Add missing field to resource table
ALTER TABLE open_telemetry.resource
ADD COLUMN dropped_attributes_count INTEGER DEFAULT 0;

-- Create histogram_bucket table for storing histogram bucket data
CREATE TABLE open_telemetry.histogram_bucket (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metric_uuid UUID NOT NULL REFERENCES open_telemetry.metric(uuid),
    bucket_index INTEGER NOT NULL,
    explicit_bound DOUBLE PRECISION,
    bucket_count BIGINT NOT NULL,
    UNIQUE(metric_uuid, bucket_index)
);

-- Add indexes for traces and spans
CREATE INDEX idx_trace_trace_id ON open_telemetry.trace(trace_id);
CREATE INDEX idx_span_trace_id ON open_telemetry.span(trace_id);
CREATE INDEX idx_span_span_id ON open_telemetry.span(span_id);
CREATE INDEX idx_span_parent_span_id ON open_telemetry.span(parent_span_id);
CREATE INDEX idx_span_event_span ON open_telemetry.span_event(span_uuid);
CREATE INDEX idx_span_event_timestamp ON open_telemetry.span_event(timestamp);
CREATE INDEX idx_span_event_attribute_event ON open_telemetry.span_event_attribute(span_event_uuid);
CREATE INDEX idx_span_link_span ON open_telemetry.span_link(span_uuid);
CREATE INDEX idx_span_link_trace_span ON open_telemetry.span_link(trace_id, span_id);
CREATE INDEX idx_span_link_attribute_link ON open_telemetry.span_link_attribute(span_link_uuid);

-- Add indexes for metrics
CREATE INDEX idx_histogram_bucket_metric ON open_telemetry.histogram_bucket(metric_uuid);
CREATE INDEX idx_metric_start_timestamp ON open_telemetry.metric(start_timestamp);

-- Add triggers for updated_at
CREATE TRIGGER updated_at_span_event
    BEFORE UPDATE ON open_telemetry.span_event
    FOR EACH ROW EXECUTE FUNCTION public.updated_at();

CREATE TRIGGER updated_at_span_event_attribute
    BEFORE UPDATE ON open_telemetry.span_event_attribute
    FOR EACH ROW EXECUTE FUNCTION public.updated_at();

CREATE TRIGGER updated_at_span_link
    BEFORE UPDATE ON open_telemetry.span_link
    FOR EACH ROW EXECUTE FUNCTION public.updated_at();

CREATE TRIGGER updated_at_span_link_attribute
    BEFORE UPDATE ON open_telemetry.span_link_attribute
    FOR EACH ROW EXECUTE FUNCTION public.updated_at();

CREATE TRIGGER updated_at_histogram_bucket
    BEFORE UPDATE ON open_telemetry.histogram_bucket
    FOR EACH ROW EXECUTE FUNCTION public.updated_at();

-- migrate:down

DROP TRIGGER IF EXISTS updated_at_histogram_bucket ON open_telemetry.histogram_bucket;
DROP TRIGGER IF EXISTS updated_at_span_link_attribute ON open_telemetry.span_link_attribute;
DROP TRIGGER IF EXISTS updated_at_span_link ON open_telemetry.span_link;
DROP TRIGGER IF EXISTS updated_at_span_event_attribute ON open_telemetry.span_event_attribute;
DROP TRIGGER IF EXISTS updated_at_span_event ON open_telemetry.span_event;

DROP INDEX IF EXISTS open_telemetry.idx_metric_start_timestamp;
DROP INDEX IF EXISTS open_telemetry.idx_histogram_bucket_metric;
DROP INDEX IF EXISTS open_telemetry.idx_span_link_attribute_link;
DROP INDEX IF EXISTS open_telemetry.idx_span_link_trace_span;
DROP INDEX IF EXISTS open_telemetry.idx_span_link_span;
DROP INDEX IF EXISTS open_telemetry.idx_span_event_attribute_event;
DROP INDEX IF EXISTS open_telemetry.idx_span_event_timestamp;
DROP INDEX IF EXISTS open_telemetry.idx_span_event_span;
DROP INDEX IF EXISTS open_telemetry.idx_span_parent_span_id;
DROP INDEX IF EXISTS open_telemetry.idx_span_span_id;
DROP INDEX IF EXISTS open_telemetry.idx_span_trace_id;
DROP INDEX IF EXISTS open_telemetry.idx_trace_trace_id;

DROP TABLE IF EXISTS open_telemetry.histogram_bucket;
DROP TABLE IF EXISTS open_telemetry.span_link_attribute;
DROP TABLE IF EXISTS open_telemetry.span_link;
DROP TABLE IF EXISTS open_telemetry.span_event_attribute;
DROP TABLE IF EXISTS open_telemetry.span_event;

ALTER TABLE open_telemetry.resource
DROP COLUMN IF EXISTS dropped_attributes_count;

ALTER TABLE open_telemetry.metric
DROP COLUMN IF EXISTS sum_value,
DROP COLUMN IF EXISTS count,
DROP COLUMN IF EXISTS max_value,
DROP COLUMN IF EXISTS min_value,
DROP COLUMN IF EXISTS is_monotonic,
DROP COLUMN IF EXISTS aggregation_temporality,
DROP COLUMN IF EXISTS start_timestamp;

ALTER TABLE open_telemetry.span
DROP COLUMN IF EXISTS dropped_links_count,
DROP COLUMN IF EXISTS dropped_events_count,
DROP COLUMN IF EXISTS dropped_attributes_count,
DROP COLUMN IF EXISTS scope_version,
DROP COLUMN IF EXISTS scope_name,
DROP COLUMN IF EXISTS parent_span_id,
DROP COLUMN IF EXISTS span_id,
DROP COLUMN IF EXISTS trace_id;

ALTER TABLE open_telemetry.trace
DROP COLUMN IF EXISTS scope_version,
DROP COLUMN IF EXISTS scope_name,
DROP COLUMN IF EXISTS trace_id;
