-- Supabase Database Initialization Script
-- This script creates all necessary users and roles for Supabase services

-- Set password from environment variable
\set postgres_password `echo "$POSTGRES_PASSWORD"`

-- Create Supabase admin user
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_admin') THEN
        CREATE USER supabase_admin WITH PASSWORD :'postgres_password';
    END IF;
END
$$;

ALTER USER supabase_admin WITH SUPERUSER CREATEDB CREATEROLE REPLICATION BYPASSRLS;

-- Create auth admin user
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_auth_admin') THEN
        CREATE USER supabase_auth_admin WITH PASSWORD :'postgres_password';
    END IF;
END
$$;

ALTER USER supabase_auth_admin WITH CREATEDB CREATEROLE;

-- Create storage admin user
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_storage_admin') THEN
        CREATE USER supabase_storage_admin WITH PASSWORD :'postgres_password';
    END IF;
END
$$;

ALTER USER supabase_storage_admin WITH CREATEDB CREATEROLE;

-- Create realtime admin user
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_realtime_admin') THEN
        CREATE USER supabase_realtime_admin WITH PASSWORD :'postgres_password';
    END IF;
END
$$;

ALTER USER supabase_realtime_admin WITH CREATEDB CREATEROLE;

-- Create authenticator user
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticator') THEN
        CREATE USER authenticator WITH PASSWORD :'postgres_password' NOINHERIT;
    END IF;
END
$$;

-- Create API roles
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN NOINHERIT;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN NOINHERIT;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
    END IF;
END
$$;

-- Grant roles to authenticator
GRANT anon TO authenticator;
GRANT authenticated TO authenticator;
GRANT service_role TO authenticator;
GRANT supabase_admin TO authenticator;

-- Create schemas
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;
CREATE SCHEMA IF NOT EXISTS realtime;
CREATE SCHEMA IF NOT EXISTS _realtime;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE SCHEMA IF NOT EXISTS _analytics;
CREATE SCHEMA IF NOT EXISTS supabase_functions;

-- Grant schema permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA auth TO supabase_auth_admin;
GRANT USAGE ON SCHEMA storage TO supabase_storage_admin;
GRANT USAGE ON SCHEMA realtime TO supabase_realtime_admin;
GRANT USAGE ON SCHEMA _realtime TO supabase_realtime_admin;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Set default privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;

-- Auth schema permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON TABLES TO supabase_auth_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON FUNCTIONS TO supabase_auth_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON SEQUENCES TO supabase_auth_admin;

-- Storage schema permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA storage GRANT ALL ON TABLES TO supabase_storage_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA storage GRANT ALL ON FUNCTIONS TO supabase_storage_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA storage GRANT ALL ON SEQUENCES TO supabase_storage_admin;

-- Realtime schema permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA realtime GRANT ALL ON TABLES TO supabase_realtime_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA realtime GRANT ALL ON FUNCTIONS TO supabase_realtime_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA realtime GRANT ALL ON SEQUENCES TO supabase_realtime_admin;

ALTER DEFAULT PRIVILEGES IN SCHEMA _realtime GRANT ALL ON TABLES TO supabase_realtime_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA _realtime GRANT ALL ON FUNCTIONS TO supabase_realtime_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA _realtime GRANT ALL ON SEQUENCES TO supabase_realtime_admin;

-- Install extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgjwt WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA extensions;

-- Set search paths
ALTER USER supabase_admin SET search_path TO public, extensions;
ALTER USER supabase_auth_admin SET search_path TO auth, public, extensions;
ALTER USER supabase_storage_admin SET search_path TO storage, public, extensions;
ALTER USER supabase_realtime_admin SET search_path TO _realtime, public, extensions;

-- Set statement timeouts for API roles
ALTER ROLE anon SET statement_timeout = '3s';
ALTER ROLE authenticated SET statement_timeout = '8s';

-- Grant select permissions for system catalogs
GRANT SELECT ON ALL TABLES IN SCHEMA information_schema TO postgres, anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA pg_catalog TO postgres, anon, authenticated, service_role;

-- Create realtime publication
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
    END IF;
END $$;

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'Supabase database initialization completed successfully';
END $$;
