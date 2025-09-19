-- JWT helper functions
create or replace function auth.jwt() returns jsonb
    language sql stable
    as $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;

create or replace function auth.uid() returns uuid
    language sql stable
    as $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim.sub', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
    )::uuid
$$;

create or replace function auth.role() returns text
    language sql stable
    as $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim.role', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'
    )::text
$$;

create or replace function auth.email() returns text
    language sql stable
    as $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim.email', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email'
    )::text
$$;
