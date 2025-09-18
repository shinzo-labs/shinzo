\restrict NbzZhxXx5eOtrplDWXwbumAdOeNcV4tDpXY40LNHkViia4bGHvJjFu1eB4jmgK3

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
    email_token text NOT NULL,
    email_token_expiry timestamp with time zone NOT NULL,
    verified boolean DEFAULT false NOT NULL,
    auto_refresh_enabled boolean DEFAULT false,
    auto_refresh_interval_seconds integer
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

\unrestrict NbzZhxXx5eOtrplDWXwbumAdOeNcV4tDpXY40LNHkViia4bGHvJjFu1eB4jmgK3


--
-- Dbmate schema migrations
--

INSERT INTO public.schema_migrations (version) VALUES
    ('20250914000000'),
    ('20250918000000');
