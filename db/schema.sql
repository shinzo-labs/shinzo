\restrict dHv7BaRtaSZAtYKH4FUpUd6b5KSTboARrEEUo0UueWvWdq2MF1WhP62sDPtZCa6

-- Dumped from database version 15.14 (Homebrew)
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
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
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    password_salt text NOT NULL,
    email_token text NOT NULL,
    email_token_expiry timestamp without time zone NOT NULL,
    verified boolean DEFAULT false NOT NULL
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
    last_seen timestamp without time zone DEFAULT CURRENT_TIMESTAMP
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
    service_name text
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
    CONSTRAINT trace_status_check CHECK ((status = ANY (ARRAY['ok'::text, 'error'::text, 'timeout'::text])))
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

\unrestrict dHv7BaRtaSZAtYKH4FUpUd6b5KSTboARrEEUo0UueWvWdq2MF1WhP62sDPtZCa6


--
-- Dbmate schema migrations
--

INSERT INTO public.schema_migrations (version) VALUES
    ('20250914000000');
