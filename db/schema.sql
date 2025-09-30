\restrict HJY0mHlPC4jvSBNsyOCIXPuloW8wcuPDDWp7b8f6zF7YbrseqQNU6tycBPBsy2r

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
-- Name: user; Type: TABLE; Schema: main; Owner: -
--

CREATE TABLE main."user" (
    uuid uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    password_salt text NOT NULL,
    email_token text,
    email_token_expiry timestamp with time zone,
    verified boolean DEFAULT false NOT NULL
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
-- Name: ingest_token; Type: TABLE; Schema: open_telemetry; Owner: -
--

CREATE TABLE open_telemetry.ingest_token (
    uuid uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    user_uuid uuid NOT NULL,
    ingest_token text NOT NULL,
    status text NOT NULL
);


--
-- Name: metric; Type: TABLE; Schema: open_telemetry; Owner: -
--

CREATE TABLE open_telemetry.metric (
    uuid uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    resource_uuid uuid NOT NULL,
    ingest_token_uuid uuid NOT NULL,
    name text NOT NULL,
    description text,
    unit text,
    metric_type text NOT NULL,
    "timestamp" timestamp with time zone NOT NULL,
    value double precision,
    scope_name text,
    scope_version text
);


--
-- Name: metric_attribute; Type: TABLE; Schema: open_telemetry; Owner: -
--

CREATE TABLE open_telemetry.metric_attribute (
    uuid uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    metric_uuid uuid NOT NULL,
    key text NOT NULL,
    value_type text NOT NULL,
    string_value text,
    int_value integer,
    double_value double precision,
    bool_value boolean,
    array_value jsonb
);


--
-- Name: resource; Type: TABLE; Schema: open_telemetry; Owner: -
--

CREATE TABLE open_telemetry.resource (
    uuid uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    user_uuid uuid NOT NULL,
    service_name text NOT NULL,
    service_version text,
    service_namespace text,
    first_seen timestamp with time zone,
    last_seen timestamp with time zone
);


--
-- Name: resource_attribute; Type: TABLE; Schema: open_telemetry; Owner: -
--

CREATE TABLE open_telemetry.resource_attribute (
    uuid uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    resource_uuid uuid NOT NULL,
    key text NOT NULL,
    value_type text NOT NULL,
    string_value text,
    int_value integer,
    double_value double precision,
    bool_value boolean,
    array_value jsonb
);


--
-- Name: session; Type: TABLE; Schema: open_telemetry; Owner: -
--

CREATE TABLE open_telemetry.session (
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    user_uuid uuid NOT NULL,
    resource_uuid uuid NOT NULL,
    session_id character varying(255) NOT NULL,
    start_time timestamp without time zone NOT NULL,
    end_time timestamp without time zone,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    error_message text,
    total_events integer DEFAULT 0 NOT NULL,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT session_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'completed'::character varying, 'error'::character varying])::text[])))
);


--
-- Name: TABLE session; Type: COMMENT; Schema: open_telemetry; Owner: -
--

COMMENT ON TABLE open_telemetry.session IS 'Stores session metadata for MCP server interactions';


--
-- Name: COLUMN session.session_id; Type: COMMENT; Schema: open_telemetry; Owner: -
--

COMMENT ON COLUMN open_telemetry.session.session_id IS 'Unique identifier for the session from the SDK';


--
-- Name: COLUMN session.status; Type: COMMENT; Schema: open_telemetry; Owner: -
--

COMMENT ON COLUMN open_telemetry.session.status IS 'Current status of the session: active, completed, or error';


--
-- Name: session_event; Type: TABLE; Schema: open_telemetry; Owner: -
--

CREATE TABLE open_telemetry.session_event (
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    session_uuid uuid NOT NULL,
    "timestamp" timestamp without time zone NOT NULL,
    event_type character varying(50) NOT NULL,
    tool_name character varying(255),
    input_data jsonb,
    output_data jsonb,
    error_data jsonb,
    duration_ms integer,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT session_event_event_type_check CHECK (((event_type)::text = ANY ((ARRAY['tool_call'::character varying, 'tool_response'::character varying, 'error'::character varying, 'user_input'::character varying, 'system_message'::character varying])::text[])))
);


--
-- Name: TABLE session_event; Type: COMMENT; Schema: open_telemetry; Owner: -
--

COMMENT ON TABLE open_telemetry.session_event IS 'Stores individual events within a session for replay and analysis';


--
-- Name: COLUMN session_event.event_type; Type: COMMENT; Schema: open_telemetry; Owner: -
--

COMMENT ON COLUMN open_telemetry.session_event.event_type IS 'Type of event: tool_call, tool_response, error, user_input, or system_message';


--
-- Name: span; Type: TABLE; Schema: open_telemetry; Owner: -
--

CREATE TABLE open_telemetry.span (
    uuid uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    trace_uuid uuid NOT NULL,
    parent_span_uuid uuid,
    operation_name text NOT NULL,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone,
    duration_ms integer,
    status_code integer,
    status_message text,
    span_kind text,
    service_name text
);


--
-- Name: span_attribute; Type: TABLE; Schema: open_telemetry; Owner: -
--

CREATE TABLE open_telemetry.span_attribute (
    uuid uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    span_uuid uuid NOT NULL,
    key text NOT NULL,
    value_type text NOT NULL,
    string_value text,
    int_value integer,
    double_value double precision,
    bool_value boolean,
    array_value jsonb
);


--
-- Name: trace; Type: TABLE; Schema: open_telemetry; Owner: -
--

CREATE TABLE open_telemetry.trace (
    uuid uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    resource_uuid uuid NOT NULL,
    ingest_token_uuid uuid NOT NULL,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone,
    service_name text NOT NULL,
    operation_name text,
    status text,
    span_count integer DEFAULT 0
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version character varying NOT NULL
);


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
-- Name: session_event session_event_pkey; Type: CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.session_event
    ADD CONSTRAINT session_event_pkey PRIMARY KEY (uuid);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (uuid);


--
-- Name: session session_session_id_key; Type: CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.session
    ADD CONSTRAINT session_session_id_key UNIQUE (session_id);


--
-- Name: span_attribute span_attribute_pkey; Type: CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.span_attribute
    ADD CONSTRAINT span_attribute_pkey PRIMARY KEY (uuid);


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
-- Name: idx_user_preferences_user_key; Type: INDEX; Schema: main; Owner: -
--

CREATE INDEX idx_user_preferences_user_key ON main.user_preferences USING btree (user_uuid, preference_key);


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
-- Name: idx_session_events_event_type; Type: INDEX; Schema: open_telemetry; Owner: -
--

CREATE INDEX idx_session_events_event_type ON open_telemetry.session_event USING btree (event_type);


--
-- Name: idx_session_events_session_uuid; Type: INDEX; Schema: open_telemetry; Owner: -
--

CREATE INDEX idx_session_events_session_uuid ON open_telemetry.session_event USING btree (session_uuid);


--
-- Name: idx_session_events_timestamp; Type: INDEX; Schema: open_telemetry; Owner: -
--

CREATE INDEX idx_session_events_timestamp ON open_telemetry.session_event USING btree ("timestamp");


--
-- Name: idx_session_events_tool_name; Type: INDEX; Schema: open_telemetry; Owner: -
--

CREATE INDEX idx_session_events_tool_name ON open_telemetry.session_event USING btree (tool_name);


--
-- Name: idx_sessions_resource_uuid; Type: INDEX; Schema: open_telemetry; Owner: -
--

CREATE INDEX idx_sessions_resource_uuid ON open_telemetry.session USING btree (resource_uuid);


--
-- Name: idx_sessions_session_id; Type: INDEX; Schema: open_telemetry; Owner: -
--

CREATE INDEX idx_sessions_session_id ON open_telemetry.session USING btree (session_id);


--
-- Name: idx_sessions_start_time; Type: INDEX; Schema: open_telemetry; Owner: -
--

CREATE INDEX idx_sessions_start_time ON open_telemetry.session USING btree (start_time);


--
-- Name: idx_sessions_status; Type: INDEX; Schema: open_telemetry; Owner: -
--

CREATE INDEX idx_sessions_status ON open_telemetry.session USING btree (status);


--
-- Name: idx_sessions_user_uuid; Type: INDEX; Schema: open_telemetry; Owner: -
--

CREATE INDEX idx_sessions_user_uuid ON open_telemetry.session USING btree (user_uuid);


--
-- Name: idx_span_attribute_span; Type: INDEX; Schema: open_telemetry; Owner: -
--

CREATE INDEX idx_span_attribute_span ON open_telemetry.span_attribute USING btree (span_uuid);


--
-- Name: idx_span_parent; Type: INDEX; Schema: open_telemetry; Owner: -
--

CREATE INDEX idx_span_parent ON open_telemetry.span USING btree (parent_span_uuid);


--
-- Name: idx_span_service; Type: INDEX; Schema: open_telemetry; Owner: -
--

CREATE INDEX idx_span_service ON open_telemetry.span USING btree (service_name);


--
-- Name: idx_span_start_time; Type: INDEX; Schema: open_telemetry; Owner: -
--

CREATE INDEX idx_span_start_time ON open_telemetry.span USING btree (start_time);


--
-- Name: idx_span_trace; Type: INDEX; Schema: open_telemetry; Owner: -
--

CREATE INDEX idx_span_trace ON open_telemetry.span USING btree (trace_uuid);


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
-- Name: user updated_at_user; Type: TRIGGER; Schema: main; Owner: -
--

CREATE TRIGGER updated_at_user BEFORE UPDATE ON main."user" FOR EACH ROW EXECUTE FUNCTION public.updated_at();


--
-- Name: user_preferences updated_at_user_preferences; Type: TRIGGER; Schema: main; Owner: -
--

CREATE TRIGGER updated_at_user_preferences BEFORE UPDATE ON main.user_preferences FOR EACH ROW EXECUTE FUNCTION public.updated_at();


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
-- Name: trace updated_at_trace; Type: TRIGGER; Schema: open_telemetry; Owner: -
--

CREATE TRIGGER updated_at_trace BEFORE UPDATE ON open_telemetry.trace FOR EACH ROW EXECUTE FUNCTION public.updated_at();


--
-- Name: user_preferences user_preferences_user_uuid_fkey; Type: FK CONSTRAINT; Schema: main; Owner: -
--

ALTER TABLE ONLY main.user_preferences
    ADD CONSTRAINT user_preferences_user_uuid_fkey FOREIGN KEY (user_uuid) REFERENCES main."user"(uuid);


--
-- Name: ingest_token ingest_token_user_uuid_fkey; Type: FK CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.ingest_token
    ADD CONSTRAINT ingest_token_user_uuid_fkey FOREIGN KEY (user_uuid) REFERENCES main."user"(uuid) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: metric_attribute metric_attribute_metric_uuid_fkey; Type: FK CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.metric_attribute
    ADD CONSTRAINT metric_attribute_metric_uuid_fkey FOREIGN KEY (metric_uuid) REFERENCES open_telemetry.metric(uuid) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: metric metric_ingest_token_uuid_fkey; Type: FK CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.metric
    ADD CONSTRAINT metric_ingest_token_uuid_fkey FOREIGN KEY (ingest_token_uuid) REFERENCES open_telemetry.ingest_token(uuid) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: metric metric_resource_uuid_fkey; Type: FK CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.metric
    ADD CONSTRAINT metric_resource_uuid_fkey FOREIGN KEY (resource_uuid) REFERENCES open_telemetry.resource(uuid) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: resource_attribute resource_attribute_resource_uuid_fkey; Type: FK CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.resource_attribute
    ADD CONSTRAINT resource_attribute_resource_uuid_fkey FOREIGN KEY (resource_uuid) REFERENCES open_telemetry.resource(uuid) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: resource resource_user_uuid_fkey; Type: FK CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.resource
    ADD CONSTRAINT resource_user_uuid_fkey FOREIGN KEY (user_uuid) REFERENCES main."user"(uuid) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: session_event session_event_session_uuid_fkey; Type: FK CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.session_event
    ADD CONSTRAINT session_event_session_uuid_fkey FOREIGN KEY (session_uuid) REFERENCES open_telemetry.session(uuid) ON DELETE CASCADE;


--
-- Name: session session_resource_uuid_fkey; Type: FK CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.session
    ADD CONSTRAINT session_resource_uuid_fkey FOREIGN KEY (resource_uuid) REFERENCES open_telemetry.resource(uuid) ON DELETE CASCADE;


--
-- Name: session session_user_uuid_fkey; Type: FK CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.session
    ADD CONSTRAINT session_user_uuid_fkey FOREIGN KEY (user_uuid) REFERENCES main."user"(uuid) ON DELETE CASCADE;


--
-- Name: span_attribute span_attribute_span_uuid_fkey; Type: FK CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.span_attribute
    ADD CONSTRAINT span_attribute_span_uuid_fkey FOREIGN KEY (span_uuid) REFERENCES open_telemetry.span(uuid) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: span span_parent_span_uuid_fkey; Type: FK CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.span
    ADD CONSTRAINT span_parent_span_uuid_fkey FOREIGN KEY (parent_span_uuid) REFERENCES open_telemetry.span(uuid) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: span span_trace_uuid_fkey; Type: FK CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.span
    ADD CONSTRAINT span_trace_uuid_fkey FOREIGN KEY (trace_uuid) REFERENCES open_telemetry.trace(uuid) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: trace trace_ingest_token_uuid_fkey; Type: FK CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.trace
    ADD CONSTRAINT trace_ingest_token_uuid_fkey FOREIGN KEY (ingest_token_uuid) REFERENCES open_telemetry.ingest_token(uuid) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: trace trace_resource_uuid_fkey; Type: FK CONSTRAINT; Schema: open_telemetry; Owner: -
--

ALTER TABLE ONLY open_telemetry.trace
    ADD CONSTRAINT trace_resource_uuid_fkey FOREIGN KEY (resource_uuid) REFERENCES open_telemetry.resource(uuid) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict HJY0mHlPC4jvSBNsyOCIXPuloW8wcuPDDWp7b8f6zF7YbrseqQNU6tycBPBsy2r


--
-- Dbmate schema migrations
--

INSERT INTO public.schema_migrations (version) VALUES
    ('20250914000000'),
    ('20250919000000'),
    ('20250930000000');
