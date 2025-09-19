-- Logs schema for analytics
create schema if not exists _analytics;

-- Create analytics users
create user supabase_admin;
alter user supabase_admin with superuser createdb createrole replication bypassrls;

-- Grant permissions for analytics
grant usage on schema _analytics to postgres, supabase_admin;
grant all on all tables in schema _analytics to postgres, supabase_admin;
grant all on all sequences in schema _analytics to postgres, supabase_admin;
grant all on all functions in schema _analytics to postgres, supabase_admin;

-- Create storage admin user
create user supabase_storage_admin;
alter user supabase_storage_admin with superuser createdb createrole replication bypassrls;

-- Create auth admin user  
create user supabase_auth_admin;
alter user supabase_auth_admin with superuser createdb createrole replication bypassrls;
