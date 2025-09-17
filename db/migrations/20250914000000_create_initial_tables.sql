-- migrate:up
create or replace function updated_at() returns trigger
language plpgsql
as
$$
begin
    NEW.updated_at = CURRENT_TIMESTAMP;
    return NEW;
end;
$$;

-- Create schemas
create schema main;
create schema open_telemetry;

-- Main schema tables
create table main.user (
    uuid uuid primary key default gen_random_uuid(),
    created_at timestamp not null default CURRENT_TIMESTAMP,
    updated_at timestamp not null default CURRENT_TIMESTAMP,
    email text unique not null,
    password_hash text unique not null,
    password_salt text unique not null,
    email_token text unique not null,
    email_token_expiry timestamp not null,
    verified boolean not null default false
);

create trigger updated_at_user
before update on main.user
for each row execute procedure updated_at();

-- OpenTelemetry schema tables
create table open_telemetry.resource (
    uuid uuid primary key default gen_random_uuid(),
    created_at timestamp not null default CURRENT_TIMESTAMP,
    updated_at timestamp not null default CURRENT_TIMESTAMP,
    user_uuid uuid not null references main.user(uuid),
    service_name text not null,
    service_version text,
    service_namespace text,
    first_seen timestamp default CURRENT_TIMESTAMP,
    last_seen timestamp default CURRENT_TIMESTAMP
);

create trigger updated_at_resource
before update on open_telemetry.resource
for each row execute procedure updated_at();

create table open_telemetry.resource_attribute (
    uuid uuid primary key default gen_random_uuid(),
    created_at timestamp not null default CURRENT_TIMESTAMP,
    updated_at timestamp not null default CURRENT_TIMESTAMP,
    resource_uuid uuid not null references open_telemetry.resource(uuid),
    key text not null,
    value_type text not null check (value_type in ('string', 'int', 'double', 'bool', 'array')),
    string_value text,
    int_value integer,
    double_value double precision,
    bool_value boolean,
    array_value jsonb
);

create trigger updated_at_resource_attribute
before update on open_telemetry.resource_attribute
for each row execute procedure updated_at();

create table open_telemetry.ingest_token (
    uuid uuid primary key default gen_random_uuid(),
    created_at timestamp not null default CURRENT_TIMESTAMP,
    updated_at timestamp not null default CURRENT_TIMESTAMP,
    user_uuid uuid not null references main.user(uuid),
    ingest_token text unique not null,
    status text not null check (status in ('live', 'deprecated'))
);

create trigger updated_at_ingest_token
before update on open_telemetry.ingest_token
for each row execute procedure updated_at();

create table open_telemetry.trace (
    uuid uuid primary key default gen_random_uuid(),
    created_at timestamp not null default CURRENT_TIMESTAMP,
    updated_at timestamp not null default CURRENT_TIMESTAMP,
    resource_uuid uuid not null references open_telemetry.resource(uuid),
    ingest_token_uuid uuid not null references open_telemetry.ingest_token(uuid),
    start_time timestamp not null,
    end_time timestamp,
    service_name text not null,
    operation_name text,
    status text check (status in ('ok', 'error', 'timeout')),
    span_count integer default 0
);

create trigger updated_at_trace
before update on open_telemetry.trace
for each row execute procedure updated_at();

create table open_telemetry.span (
    uuid uuid primary key default gen_random_uuid(),
    created_at timestamp not null default CURRENT_TIMESTAMP,
    updated_at timestamp not null default CURRENT_TIMESTAMP,
    trace_uuid uuid not null references open_telemetry.trace(uuid),
    parent_span_uuid uuid references open_telemetry.span(uuid),
    operation_name text not null,
    start_time timestamp not null,
    end_time timestamp,
    duration_ms integer,
    status_code integer,
    status_message text,
    span_kind text,
    service_name text
);

create trigger updated_at_span
before update on open_telemetry.span
for each row execute procedure updated_at();

create table open_telemetry.span_attribute (
    uuid uuid primary key default gen_random_uuid(),
    created_at timestamp not null default CURRENT_TIMESTAMP,
    updated_at timestamp not null default CURRENT_TIMESTAMP,
    span_uuid uuid not null references open_telemetry.span(uuid),
    key text not null,
    value_type text not null check (value_type in ('string', 'int', 'double', 'bool', 'array')),
    string_value text,
    int_value integer,
    double_value double precision,
    bool_value boolean,
    array_value jsonb
);

create trigger updated_at_span_attribute
before update on open_telemetry.span_attribute
for each row execute procedure updated_at();

create table open_telemetry.metric (
    uuid uuid primary key default gen_random_uuid(),
    created_at timestamp not null default CURRENT_TIMESTAMP,
    updated_at timestamp not null default CURRENT_TIMESTAMP,
    resource_uuid uuid not null references open_telemetry.resource(uuid),
    ingest_token_uuid uuid not null references open_telemetry.ingest_token(uuid),
    name text not null,
    description text,
    unit text,
    metric_type text not null check (metric_type in ('counter', 'gauge', 'histogram')),
    timestamp timestamp not null,
    value double precision,
    scope_name text,
    scope_version text
);

create trigger updated_at_metric
before update on open_telemetry.metric
for each row execute procedure updated_at();

create table open_telemetry.metric_attribute (
    uuid uuid primary key default gen_random_uuid(),
    created_at timestamp not null default CURRENT_TIMESTAMP,
    updated_at timestamp not null default CURRENT_TIMESTAMP,
    metric_uuid uuid not null references open_telemetry.metric(uuid),
    key text not null,
    value_type text not null check (value_type in ('string', 'int', 'double', 'bool', 'array')),
    string_value text,
    int_value integer,
    double_value double precision,
    bool_value boolean,
    array_value jsonb
);

create trigger updated_at_metric_attribute
before update on open_telemetry.metric_attribute
for each row execute procedure updated_at();

-- Indexes for performance optimization
create index idx_resource_user on open_telemetry.resource(user_uuid);
create index idx_resource_service on open_telemetry.resource(service_name);
create index idx_resource_attribute_resource on open_telemetry.resource_attribute(resource_uuid);
create index idx_ingest_token_user on open_telemetry.ingest_token(user_uuid);
create index idx_ingest_token_status on open_telemetry.ingest_token(status);
create index idx_trace_resource on open_telemetry.trace(resource_uuid);
create index idx_trace_ingest_token on open_telemetry.trace(ingest_token_uuid);
create index idx_trace_start_time on open_telemetry.trace(start_time);
create index idx_trace_service on open_telemetry.trace(service_name);
create index idx_span_trace on open_telemetry.span(trace_uuid);
create index idx_span_parent on open_telemetry.span(parent_span_uuid);
create index idx_span_start_time on open_telemetry.span(start_time);
create index idx_span_service on open_telemetry.span(service_name);
create index idx_span_attribute_span on open_telemetry.span_attribute(span_uuid);
create index idx_metric_resource on open_telemetry.metric(resource_uuid);
create index idx_metric_ingest_token on open_telemetry.metric(ingest_token_uuid);
create index idx_metric_timestamp on open_telemetry.metric(timestamp);
create index idx_metric_name on open_telemetry.metric(name);
create index idx_metric_attribute_metric on open_telemetry.metric_attribute(metric_uuid);

-- migrate:down
drop schema if exists open_telemetry cascade;
drop schema if exists main cascade;
drop function if exists updated_at() cascade;
