\restrict weCtKr8lOjkNo8I3JQfQxDvkkHH3ep5T7Suq6wueAAg84DFnC2oU4TlvbR455Lf

-- Dumped from database version 15.14 (Homebrew)
-- Dumped by pg_dump version 15.14 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: main; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA main;


--
-- Name: open_telemetry; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA open_telemetry;


--
-- Name: updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    NEW.updated_at = CURRENT_TIMESTAMP;
    return NEW;
end;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: subscription_tier; Type: TABLE; Schema: main; Owner: -
--

CREATE TABLE main.subscription_tier (
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tier text NOT NULL,
    monthly_quota integer,
    CONSTRAINT subscription_tier_tier_check CHECK ((tier = ANY (ARRAY['free'::text, 'growth'::text, 'scale'::text])))
);


--
-- Name: user; Type: TABLE; Schema: main; Owner: -
--

CREATE TABLE main."user" (
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    password_salt text NOT NULL,
    email_token text NOT NULL,
    email_token_expiry timestamp without time zone NOT NULL,
    verified boolean DEFAULT false NOT NULL,
    monthly_counter integer DEFAULT 0 NOT NULL,
    last_counter_reset timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    subscription_tier_uuid uuid NOT NULL,
    subscribed_on timestamp without time zone
);


--
-- Name: user_preferences; Type: TABLE; Schema: main; Owner: -
--

CREATE TABLE main.user_preferences (
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    user_uuid uuid NOT NULL,
    preference_key text NOT NULL,
    preference_value jsonb NOT NULL
);


--
-- Name: histogram_bucket; Type: TABLE; Schema: open_telemetry; Owner: -
--

CREATE TABLE open_telemetry.histogram_bucket (
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    metric_uuid uuid NOT NULL,
    bucket_index integer NOT NULL,
    explicit_bound double precision,
    bucket_count bigint NOT NULL
);


--
-- Name: ingest_token; Type: TABLE; Schema: open_telemetry; Owner: -
--

CREATE TABLE open_telemetry.ingest_token (
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    user_uuid uuid NOT NULL,
    ingest_token text NOT NULL,
    status text NOT NULL,
    CONSTRAINT ingest_token_status_check CHECK ((status = ANY (ARRAY['live'::text, 'deprecated'::text])))
);


--
-- Name: metric; Type: TABLE; Schema: open_telemetry; Owner: -
--

CREATE TABLE open_telemetry.metric (
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    resource_uuid uuid NOT NULL,
    ingest_token_uuid uuid NOT NULL,
    name text NOT NULL,
    description text,
    unit text,
    metric_type text NOT NULL,
    "timestamp" timestamp without time zone NOT NULL,
    value double precision,
    scope_name text,
    scope_version text,
    start_timestamp timestamp without time zone,
    aggregation_temporality integer,
    is_monotonic boolean,
    min_value double precision,
    max_value double precision,
    count bigint,
    sum_value double precision,
    CONSTRAINT metric_metric_type_check CHECK ((metric_type = ANY (ARRAY['counter'::text, 'gauge'::text, 'histogram'::text])))
);


--
-- Name: metric_attribute; Type: TABLE; Schema: open_telemetry; Owner: -
--

CREATE TABLE open_telemetry.metric_attribute (
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    metric_uuid uuid NOT NULL,
    key text NOT NULL,
    value_type text NOT NULL,
    string_value text,
    int_value integer,
    double_value double precision,
    bool_value boolean,
    array_value jsonb,
    CONSTRAINT metric_attribute_value_type_check CHECK ((value_type = ANY (ARRAY['string'::text, 'int'::text, 'double'::text, 'bool'::text, 'array'::text])))
);


--
-- Name: resource; Type: TABLE; Schema: open_telemetry; Owner: -
--

CREATE TABLE open_telemetry.resource (
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    user_uuid uuid NOT NULL,
    service_name text NOT NULL,
    service_version text,
    service_namespace text,
    first_seen timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_seen timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    dropped_attributes_count integer DEFAULT 0
);


--
-- Name: resource_attribute; Type: TABLE; Schema: open_telemetry; Owner: -
--

CREATE TABLE open_telemetry.resource_attribute (
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    resource_uuid uuid NOT NULL,
    key text NOT NULL,
    value_type text NOT NULL,
    string_value text,
    int_value integer,
    double_value double precision,
    bool_value boolean,
    array_value jsonb,
    CONSTRAINT resource_attribute_value_type_check CHECK ((value_type = ANY (ARRAY['string'::text, 'int'::text, 'double'::text, 'bool'::text, 'array'::text])))
);


--
-- Name: span; Type: TABLE; Schema: open_telemetry; Owner: -
--

CREATE TABLE open_telemetry.span (
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    trace_uuid uuid NOT NULL,
    parent_span_uuid uuid,
    operation_name text NOT NULL,
    start_time timestamp without time zone NOT NULL,
    end_time timestamp without time zone,
    duration_ms integer,
    status_code integer,
    status_message text,
    span_kind text,
    service_name text,
    trace_id text,
    span_id text,
    parent_span_id text,
    scope_name text,
    scope_version text,
    dropped_attributes_count integer DEFAULT 0,
    dropped_events_count integer DEFAULT 0,
    dropped_links_count integer DEFAULT 0
);


--
-- Name: span_attribute; Type: TABLE; Schema: open_telemetry; Owner: -
--

CREATE TABLE open_telemetry.span_attribute (
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    span_uuid uuid NOT NULL,
    key text NOT NULL,
    value_type text NOT NULL,
    string_value text,
    int_value integer,
    double_value double precision,
    bool_value boolean,
    array_value jsonb,
    CONSTRAINT span_attribute_value_type_check CHECK ((value_type = ANY (ARRAY['string'::text, 'int'::text, 'double'::text, 'bool'::text, 'array'::text])))
);


--
-- Name: span_event; Type: TABLE; Schema: open_telemetry; Owner: -
--

CREATE TABLE open_telemetry.span_event (
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    span_uuid uuid NOT NULL,
    name text NOT NULL,
    "timestamp" timestamp without time zone NOT NULL,
    dropped_attributes_count integer DEFAULT 0
);


--
-- Name: span_event_attribute; Type: TABLE; Schema: open_telemetry; Owner: -
--

CREATE TABLE open_telemetry.span_event_attribute (
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    span_event_uuid uuid NOT NULL,
    key text NOT NULL,
    value_type text NOT NULL,
    string_value text,
    int_value integer,
    double_value double precision,
    bool_value boolean,
    array_value jsonb,
    CONSTRAINT span_event_attribute_value_type_check CHECK ((value_type = ANY (ARRAY['string'::text, 'int'::text, 'double'::text, 'bool'::text, 'array'::text])))
);


--
-- Name: span_link; Type: TABLE; Schema: open_telemetry; Owner: -
--

CREATE TABLE open_telemetry.span_link (
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    span_uuid uuid NOT NULL,
    trace_id text NOT NULL,
    span_id text NOT NULL,
    trace_state text,
    dropped_attributes_count integer DEFAULT 0
);


--
-- Name: span_link_attribute; Type: TABLE; Schema: open_telemetry; Owner: -
--

CREATE TABLE open_telemetry.span_link_attribute (
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    span_link_uuid uuid NOT NULL,
    key text NOT NULL,
    value_type text NOT NULL,
    string_value text,
    int_value integer,
    double_value double precision,
    bool_value boolean,
    array_value jsonb,
    CONSTRAINT span_link_attribute_value_type_check CHECK ((value_type = ANY (ARRAY['string'::text, 'int'::text, 'double'::text, 'bool'::text, 'array'::text])))
);


--
-- Name: trace; Type: TABLE; Schema: open_telemetry; Owner: -
--

CREATE TABLE open_telemetry.trace (
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    resource_uuid uuid NOT NULL,
    ingest_token_uuid uuid NOT NULL,
    start_time timestamp without time zone NOT NULL,
    end_time timestamp without time zone,
    service_name text NOT NULL,
    operation_name text,
    status text,
    span_count integer DEFAULT 0,
    trace_id text,
    scope_name text,
    scope_version text,
    CONSTRAINT trace_status_check CHECK ((status = ANY (ARRAY['ok'::text, 'error'::text, 'timeout'::text])))
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version character varying NOT NULL
);


--
-- Name: subscription_tier subscription_tier_pkey; Type: CONSTRAINT; Schema: main; Owner: -
--

ALTER TABLE ONLY main.subscription_tier
    ADD CONSTRAINT subscription_tier_pkey PRIMARY KEY (uuid);


--
-- Name: subscription_tier subscription_tier_tier_key; Type: CONSTRAINT; Schema: main; Owner: -
--

ALTER TABLE ONLY main.subscription_tier
    ADD CONSTRAINT subscription_tier_tier_key UNIQUE (tier);


--
-- Name: user user_email_key; Type: CONSTRAINT; Schema: main; Owner: -
--

ALTER TABLE ONLY main."user"
    ADD CONSTRAINT user_email_key UNIQUE (email);


--
-- Name: user user_email_token_key; Type: CONSTRAINT; Schema: main; Owner: -
--

ALTER TABLE ONLY main."user"
    ADD CONSTRAINT user_email_token_key UNIQUE (email_token);


--
-- Name: user user_password_hash_key; Type: CONSTRAINT; Schema: main; Owner: -
--

ALTER TABLE ONLY main."user"
    ADD CONSTRAINT user_password_hash_key UNIQUE (password_hash);


--
-- Name: user user_password_salt_key; Type: CONSTRAINT; Schema: main; Owner: -
--

ALTER TABLE ONLY main."user"
    ADD CONSTRAINT user_password_salt_key UNIQUE (password_salt);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: main; Owner: -
--

ALTER TABLE ONLY main."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (uuid);


--
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: main; Owner: -
--

ALTER TABLE ONLY main.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (uuid);


--
-- Name: user_preferences user_preferences_user_uuid_preference_key_key; Type: CONSTRAINT; Schema: main; Owner: -
--

ALTER TABLE ONLY main.user_preferences
    ADD CONSTRAINT user_preferences_user_uuid_preference_key_key UNIQUE (user_uuid, preference_key);


--
-- Name: histogram_bucket histogram_bucket_metric_uuid_bucket_index_key; Type: CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.histogram_bucket
    ADD CONSTRAINT histogram_bucket_metric_uuid_bucket_index_key UNIQUE (metric_uuid, bucket_index);


--
-- Name: histogram_bucket histogram_bucket_pkey; Type: CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.histogram_bucket
    ADD CONSTRAINT histogram_bucket_pkey PRIMARY KEY (uuid);


--
-- Name: ingest_token ingest_token_ingest_token_key; Type: CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.ingest_token
    ADD CONSTRAINT ingest_token_ingest_token_key UNIQUE (ingest_token);


--
-- Name: ingest_token ingest_token_pkey; Type: CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.ingest_token
    ADD CONSTRAINT ingest_token_pkey PRIMARY KEY (uuid);


--
-- Name: metric_attribute metric_attribute_pkey; Type: CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.metric_attribute
    ADD CONSTRAINT metric_attribute_pkey PRIMARY KEY (uuid);


--
-- Name: metric metric_pkey; Type: CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.metric
    ADD CONSTRAINT metric_pkey PRIMARY KEY (uuid);


--
-- Name: resource_attribute resource_attribute_pkey; Type: CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.resource_attribute
    ADD CONSTRAINT resource_attribute_pkey PRIMARY KEY (uuid);


--
-- Name: resource resource_pkey; Type: CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.resource
    ADD CONSTRAINT resource_pkey PRIMARY KEY (uuid);


--
-- Name: span_attribute span_attribute_pkey; Type: CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.span_attribute
    ADD CONSTRAINT span_attribute_pkey PRIMARY KEY (uuid);


--
-- Name: span_event_attribute span_event_attribute_pkey; Type: CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.span_event_attribute
    ADD CONSTRAINT span_event_attribute_pkey PRIMARY KEY (uuid);


--
-- Name: span_event span_event_pkey; Type: CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.span_event
    ADD CONSTRAINT span_event_pkey PRIMARY KEY (uuid);


--
-- Name: span_link_attribute span_link_attribute_pkey; Type: CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.span_link_attribute
    ADD CONSTRAINT span_link_attribute_pkey PRIMARY KEY (uuid);


--
-- Name: span_link span_link_pkey; Type: CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.span_link
    ADD CONSTRAINT span_link_pkey PRIMARY KEY (uuid);


--
-- Name: span span_pkey; Type: CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.span
    ADD CONSTRAINT span_pkey PRIMARY KEY (uuid);


--
-- Name: trace trace_pkey; Type: CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.trace
    ADD CONSTRAINT trace_pkey PRIMARY KEY (uuid);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: idx_user_last_counter_reset; Type: INDEX; Schema: main; Owner: -
--

CREATE INDEX idx_user_last_counter_reset ON main."user" USING btree (last_counter_reset);


--
-- Name: idx_user_preferences_user_key; Type: INDEX; Schema: main; Owner: -
--

CREATE INDEX idx_user_preferences_user_key ON main.user_preferences USING btree (user_uuid, preference_key);


--
-- Name: idx_user_subscription_tier; Type: INDEX; Schema: main; Owner: -
--

CREATE INDEX idx_user_subscription_tier ON main."user" USING btree (subscription_tier_uuid);


--
-- Name: idx_histogram_bucket_metric; Type: INDEX; Schema: open_telemetry; Owner: -
--

CREATE INDEX idx_histogram_bucket_metric ON open_telemetry.histogram_bucket USING btree (metric_uuid);


--
-- Name: idx_ingest_token_status; Type: INDEX; Schema: open_telemetry; Owner: -
--

CREATE INDEX idx_ingest_token_status ON open_telemetry.ingest_token USING btree (status);


--
-- Name: idx_ingest_token_user; Type: INDEX; Schema: open_telemetry; Owner: -
--

CREATE INDEX idx_ingest_token_user ON open_telemetry.ingest_token USING btree (user_uuid);


--
-- Name: idx_metric_attribute_metric; Type: INDEX; Schema: open_telemetry; Owner: -
--

CREATE INDEX idx_metric_attribute_metric ON open_telemetry.metric_attribute USING btree (metric_uuid);


--
-- Name: idx_metric_ingest_token; Type: INDEX; Schema: open_telemetry; Owner: -
--

CREATE INDEX idx_metric_ingest_token ON open_telemetry.metric USING btree (ingest_token_uuid);


--
-- Name: idx_metric_name; Type: INDEX; Schema: open_telemetry; Owner: -
--

CREATE INDEX idx_metric_name ON open_telemetry.metric USING btree (name);


--
-- Name: idx_metric_resource; Type: INDEX; Schema: open_telemetry; Owner: -
--

CREATE INDEX idx_metric_resource ON open_telemetry.metric USING btree (resource_uuid);


--
-- Name: idx_metric_start_timestamp; Type: INDEX; Schema: open_telemetry; Owner: -
--

CREATE INDEX idx_metric_start_timestamp ON open_telemetry.metric USING btree (start_timestamp);


--
-- Name: idx_metric_timestamp; Type: INDEX; Schema: open_telemetry; Owner: -
--

CREATE INDEX idx_metric_timestamp ON open_telemetry.metric USING btree ("timestamp");


--
-- Name: idx_resource_attribute_resource; Type: INDEX; Schema: open_telemetry; Owner: -
--

CREATE INDEX idx_resource_attribute_resource ON open_telemetry.resource_attribute USING btree (resource_uuid);


--
-- Name: idx_resource_service; Type: INDEX; Schema: open_telemetry; Owner: -
--

CREATE INDEX idx_resource_service ON open_telemetry.resource USING btree (service_name);


--
-- Name: idx_resource_user; Type: INDEX; Schema: open_telemetry; Owner: -
--

CREATE INDEX idx_resource_user ON open_telemetry.resource USING btree (user_uuid);


--
-- Name: idx_span_attribute_span; Type: INDEX; Schema: open_telemetry; Owner: -
--

CREATE INDEX idx_span_attribute_span ON open_telemetry.span_attribute USING btree (span_uuid);


--
-- Name: idx_span_event_attribute_event; Type: INDEX; Schema: open_telemetry; Owner: -
--

CREATE INDEX idx_span_event_attribute_event ON open_telemetry.span_event_attribute USING btree (span_event_uuid);


--
-- Name: idx_span_event_span; Type: INDEX; Schema: open_telemetry; Owner: -
--

CREATE INDEX idx_span_event_span ON open_telemetry.span_event USING btree (span_uuid);


--
-- Name: idx_span_event_timestamp; Type: INDEX; Schema: open_telemetry; Owner: -
--

CREATE INDEX idx_span_event_timestamp ON open_telemetry.span_event USING btree ("timestamp");


--
-- Name: idx_span_link_attribute_link; Type: INDEX; Schema: open_telemetry; Owner: -
--

CREATE INDEX idx_span_link_attribute_link ON open_telemetry.span_link_attribute USING btree (span_link_uuid);


--
-- Name: idx_span_link_span; Type: INDEX; Schema: open_telemetry; Owner: -
--

CREATE INDEX idx_span_link_span ON open_telemetry.span_link USING btree (span_uuid);


--
-- Name: idx_span_link_trace_span; Type: INDEX; Schema: open_telemetry; Owner: -
--

CREATE INDEX idx_span_link_trace_span ON open_telemetry.span_link USING btree (trace_id, span_id);


--
-- Name: idx_span_parent; Type: INDEX; Schema: open_telemetry; Owner: -
--

CREATE INDEX idx_span_parent ON open_telemetry.span USING btree (parent_span_uuid);


--
-- Name: idx_span_parent_span_id; Type: INDEX; Schema: open_telemetry; Owner: -
--

CREATE INDEX idx_span_parent_span_id ON open_telemetry.span USING btree (parent_span_id);


--
-- Name: idx_span_service; Type: INDEX; Schema: open_telemetry; Owner: -
--

CREATE INDEX idx_span_service ON open_telemetry.span USING btree (service_name);


--
-- Name: idx_span_span_id; Type: INDEX; Schema: open_telemetry; Owner: -
--

CREATE INDEX idx_span_span_id ON open_telemetry.span USING btree (span_id);


--
-- Name: idx_span_start_time; Type: INDEX; Schema: open_telemetry; Owner: -
--

CREATE INDEX idx_span_start_time ON open_telemetry.span USING btree (start_time);


--
-- Name: idx_span_trace; Type: INDEX; Schema: open_telemetry; Owner: -
--

CREATE INDEX idx_span_trace ON open_telemetry.span USING btree (trace_uuid);


--
-- Name: idx_span_trace_id; Type: INDEX; Schema: open_telemetry; Owner: -
--

CREATE INDEX idx_span_trace_id ON open_telemetry.span USING btree (trace_id);


--
-- Name: idx_trace_ingest_token; Type: INDEX; Schema: open_telemetry; Owner: -
--

CREATE INDEX idx_trace_ingest_token ON open_telemetry.trace USING btree (ingest_token_uuid);


--
-- Name: idx_trace_resource; Type: INDEX; Schema: open_telemetry; Owner: -
--

CREATE INDEX idx_trace_resource ON open_telemetry.trace USING btree (resource_uuid);


--
-- Name: idx_trace_service; Type: INDEX; Schema: open_telemetry; Owner: -
--

CREATE INDEX idx_trace_service ON open_telemetry.trace USING btree (service_name);


--
-- Name: idx_trace_start_time; Type: INDEX; Schema: open_telemetry; Owner: -
--

CREATE INDEX idx_trace_start_time ON open_telemetry.trace USING btree (start_time);


--
-- Name: idx_trace_trace_id; Type: INDEX; Schema: open_telemetry; Owner: -
--

CREATE INDEX idx_trace_trace_id ON open_telemetry.trace USING btree (trace_id);


--
-- Name: subscription_tier updated_at_subscription_tier; Type: TRIGGER; Schema: main; Owner: -
--

CREATE TRIGGER updated_at_subscription_tier BEFORE UPDATE ON main.subscription_tier FOR EACH ROW EXECUTE FUNCTION public.updated_at();


--
-- Name: user updated_at_user; Type: TRIGGER; Schema: main; Owner: -
--

CREATE TRIGGER updated_at_user BEFORE UPDATE ON main."user" FOR EACH ROW EXECUTE FUNCTION public.updated_at();


--
-- Name: user_preferences updated_at_user_preferences; Type: TRIGGER; Schema: main; Owner: -
--

CREATE TRIGGER updated_at_user_preferences BEFORE UPDATE ON main.user_preferences FOR EACH ROW EXECUTE FUNCTION public.updated_at();


--
-- Name: histogram_bucket updated_at_histogram_bucket; Type: TRIGGER; Schema: open_telemetry; Owner: -
--

CREATE TRIGGER updated_at_histogram_bucket BEFORE UPDATE ON open_telemetry.histogram_bucket FOR EACH ROW EXECUTE FUNCTION public.updated_at();


--
-- Name: ingest_token updated_at_ingest_token; Type: TRIGGER; Schema: open_telemetry; Owner: -
--

CREATE TRIGGER updated_at_ingest_token BEFORE UPDATE ON open_telemetry.ingest_token FOR EACH ROW EXECUTE FUNCTION public.updated_at();


--
-- Name: metric updated_at_metric; Type: TRIGGER; Schema: open_telemetry; Owner: -
--

CREATE TRIGGER updated_at_metric BEFORE UPDATE ON open_telemetry.metric FOR EACH ROW EXECUTE FUNCTION public.updated_at();


--
-- Name: metric_attribute updated_at_metric_attribute; Type: TRIGGER; Schema: open_telemetry; Owner: -
--

CREATE TRIGGER updated_at_metric_attribute BEFORE UPDATE ON open_telemetry.metric_attribute FOR EACH ROW EXECUTE FUNCTION public.updated_at();


--
-- Name: resource updated_at_resource; Type: TRIGGER; Schema: open_telemetry; Owner: -
--

CREATE TRIGGER updated_at_resource BEFORE UPDATE ON open_telemetry.resource FOR EACH ROW EXECUTE FUNCTION public.updated_at();


--
-- Name: resource_attribute updated_at_resource_attribute; Type: TRIGGER; Schema: open_telemetry; Owner: -
--

CREATE TRIGGER updated_at_resource_attribute BEFORE UPDATE ON open_telemetry.resource_attribute FOR EACH ROW EXECUTE FUNCTION public.updated_at();


--
-- Name: span updated_at_span; Type: TRIGGER; Schema: open_telemetry; Owner: -
--

CREATE TRIGGER updated_at_span BEFORE UPDATE ON open_telemetry.span FOR EACH ROW EXECUTE FUNCTION public.updated_at();


--
-- Name: span_attribute updated_at_span_attribute; Type: TRIGGER; Schema: open_telemetry; Owner: -
--

CREATE TRIGGER updated_at_span_attribute BEFORE UPDATE ON open_telemetry.span_attribute FOR EACH ROW EXECUTE FUNCTION public.updated_at();


--
-- Name: span_event updated_at_span_event; Type: TRIGGER; Schema: open_telemetry; Owner: -
--

CREATE TRIGGER updated_at_span_event BEFORE UPDATE ON open_telemetry.span_event FOR EACH ROW EXECUTE FUNCTION public.updated_at();


--
-- Name: span_event_attribute updated_at_span_event_attribute; Type: TRIGGER; Schema: open_telemetry; Owner: -
--

CREATE TRIGGER updated_at_span_event_attribute BEFORE UPDATE ON open_telemetry.span_event_attribute FOR EACH ROW EXECUTE FUNCTION public.updated_at();


--
-- Name: span_link updated_at_span_link; Type: TRIGGER; Schema: open_telemetry; Owner: -
--

CREATE TRIGGER updated_at_span_link BEFORE UPDATE ON open_telemetry.span_link FOR EACH ROW EXECUTE FUNCTION public.updated_at();


--
-- Name: span_link_attribute updated_at_span_link_attribute; Type: TRIGGER; Schema: open_telemetry; Owner: -
--

CREATE TRIGGER updated_at_span_link_attribute BEFORE UPDATE ON open_telemetry.span_link_attribute FOR EACH ROW EXECUTE FUNCTION public.updated_at();


--
-- Name: trace updated_at_trace; Type: TRIGGER; Schema: open_telemetry; Owner: -
--

CREATE TRIGGER updated_at_trace BEFORE UPDATE ON open_telemetry.trace FOR EACH ROW EXECUTE FUNCTION public.updated_at();


--
-- Name: user_preferences user_preferences_user_uuid_fkey; Type: FK CONSTRAINT; Schema: main; Owner: -
--

ALTER TABLE ONLY main.user_preferences
    ADD CONSTRAINT user_preferences_user_uuid_fkey FOREIGN KEY (user_uuid) REFERENCES main."user"(uuid);


--
-- Name: user user_subscription_tier_uuid_fkey; Type: FK CONSTRAINT; Schema: main; Owner: -
--

ALTER TABLE ONLY main."user"
    ADD CONSTRAINT user_subscription_tier_uuid_fkey FOREIGN KEY (subscription_tier_uuid) REFERENCES main.subscription_tier(uuid);


--
-- Name: histogram_bucket histogram_bucket_metric_uuid_fkey; Type: FK CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.histogram_bucket
    ADD CONSTRAINT histogram_bucket_metric_uuid_fkey FOREIGN KEY (metric_uuid) REFERENCES open_telemetry.metric(uuid);


--
-- Name: ingest_token ingest_token_user_uuid_fkey; Type: FK CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.ingest_token
    ADD CONSTRAINT ingest_token_user_uuid_fkey FOREIGN KEY (user_uuid) REFERENCES main."user"(uuid);


--
-- Name: metric_attribute metric_attribute_metric_uuid_fkey; Type: FK CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.metric_attribute
    ADD CONSTRAINT metric_attribute_metric_uuid_fkey FOREIGN KEY (metric_uuid) REFERENCES open_telemetry.metric(uuid);


--
-- Name: metric metric_ingest_token_uuid_fkey; Type: FK CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.metric
    ADD CONSTRAINT metric_ingest_token_uuid_fkey FOREIGN KEY (ingest_token_uuid) REFERENCES open_telemetry.ingest_token(uuid);


--
-- Name: metric metric_resource_uuid_fkey; Type: FK CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.metric
    ADD CONSTRAINT metric_resource_uuid_fkey FOREIGN KEY (resource_uuid) REFERENCES open_telemetry.resource(uuid);


--
-- Name: resource_attribute resource_attribute_resource_uuid_fkey; Type: FK CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.resource_attribute
    ADD CONSTRAINT resource_attribute_resource_uuid_fkey FOREIGN KEY (resource_uuid) REFERENCES open_telemetry.resource(uuid);


--
-- Name: resource resource_user_uuid_fkey; Type: FK CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.resource
    ADD CONSTRAINT resource_user_uuid_fkey FOREIGN KEY (user_uuid) REFERENCES main."user"(uuid);


--
-- Name: span_attribute span_attribute_span_uuid_fkey; Type: FK CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.span_attribute
    ADD CONSTRAINT span_attribute_span_uuid_fkey FOREIGN KEY (span_uuid) REFERENCES open_telemetry.span(uuid);


--
-- Name: span_event_attribute span_event_attribute_span_event_uuid_fkey; Type: FK CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.span_event_attribute
    ADD CONSTRAINT span_event_attribute_span_event_uuid_fkey FOREIGN KEY (span_event_uuid) REFERENCES open_telemetry.span_event(uuid);


--
-- Name: span_event span_event_span_uuid_fkey; Type: FK CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.span_event
    ADD CONSTRAINT span_event_span_uuid_fkey FOREIGN KEY (span_uuid) REFERENCES open_telemetry.span(uuid);


--
-- Name: span_link_attribute span_link_attribute_span_link_uuid_fkey; Type: FK CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.span_link_attribute
    ADD CONSTRAINT span_link_attribute_span_link_uuid_fkey FOREIGN KEY (span_link_uuid) REFERENCES open_telemetry.span_link(uuid);


--
-- Name: span_link span_link_span_uuid_fkey; Type: FK CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.span_link
    ADD CONSTRAINT span_link_span_uuid_fkey FOREIGN KEY (span_uuid) REFERENCES open_telemetry.span(uuid);


--
-- Name: span span_parent_span_uuid_fkey; Type: FK CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.span
    ADD CONSTRAINT span_parent_span_uuid_fkey FOREIGN KEY (parent_span_uuid) REFERENCES open_telemetry.span(uuid);


--
-- Name: span span_trace_uuid_fkey; Type: FK CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.span
    ADD CONSTRAINT span_trace_uuid_fkey FOREIGN KEY (trace_uuid) REFERENCES open_telemetry.trace(uuid);


--
-- Name: trace trace_ingest_token_uuid_fkey; Type: FK CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.trace
    ADD CONSTRAINT trace_ingest_token_uuid_fkey FOREIGN KEY (ingest_token_uuid) REFERENCES open_telemetry.ingest_token(uuid);


--
-- Name: trace trace_resource_uuid_fkey; Type: FK CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.trace
    ADD CONSTRAINT trace_resource_uuid_fkey FOREIGN KEY (resource_uuid) REFERENCES open_telemetry.resource(uuid);


--
-- PostgreSQL database dump complete
--

\unrestrict weCtKr8lOjkNo8I3JQfQxDvkkHH3ep5T7Suq6wueAAg84DFnC2oU4TlvbR455Lf


--
-- Dbmate schema migrations
--

INSERT INTO public.schema_migrations (version) VALUES
    ('20250914000000'),
    ('20250918000000'),
    ('20250919000000'),
    ('20250930000000'),
    ('20251001000000'),
    ('20251002000000');
