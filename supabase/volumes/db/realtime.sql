-- Realtime schema and functions
create schema if not exists _realtime;

-- Create realtime schema
create schema if not exists realtime;

-- Create realtime publication
create publication supabase_realtime for all tables;

-- Grant permissions for realtime
grant usage on schema realtime to postgres, anon, authenticated, service_role;
grant all on all tables in schema realtime to postgres, anon, authenticated, service_role;
grant all on all sequences in schema realtime to postgres, anon, authenticated, service_role;
grant all on all functions in schema realtime to postgres, anon, authenticated, service_role;

-- Create realtime users
create user supabase_realtime_admin;
alter user supabase_realtime_admin with superuser createdb createrole replication bypassrls;

-- Grant realtime permissions
grant all privileges on database postgres to supabase_realtime_admin;
grant all on schema realtime to supabase_realtime_admin;
grant all on all tables in schema realtime to supabase_realtime_admin;
grant all on all sequences in schema realtime to supabase_realtime_admin;
grant all on all functions in schema realtime to supabase_realtime_admin;
