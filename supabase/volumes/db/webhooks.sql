-- Webhooks
create schema if not exists supabase_functions;

create or replace function supabase_functions.http_request()
returns trigger
language plpgsql
as $$
declare
  request_id bigint;
  payload jsonb;
  url text := TG_ARGV[0]::text;
  method text := TG_ARGV[1]::text;
  headers jsonb DEFAULT '{}'::jsonb;
  params jsonb DEFAULT '{}'::jsonb;
  timeout_ms integer DEFAULT 1000;
begin
  if url is null or url = 'null' then
    raise exception 'url argument is missing';
  end if;

  if method is null or method = 'null' then
    method := 'POST';
  end if;

  if TG_ARGV[2] is not null and TG_ARGV[2] != 'null' then
    headers := TG_ARGV[2]::jsonb;
  end if;

  if TG_ARGV[3] is not null and TG_ARGV[3] != 'null' then
    params := TG_ARGV[3]::jsonb;
  end if;

  if TG_ARGV[4] is not null and TG_ARGV[4] != 'null' then
    timeout_ms := TG_ARGV[4]::integer;
  end if;

  case
    when method = 'GET' then
      select http_get into request_id from net.http_get(
        url,
        params,
        headers,
        timeout_ms
      );
    when method = 'POST' then
      payload := jsonb_build_object(
        'old_record', OLD,
        'record', NEW,
        'type', TG_OP,
        'table', TG_TABLE_NAME,
        'schema', TG_TABLE_SCHEMA
      );

      select http_post into request_id from net.http_post(
        url,
        payload,
        params,
        headers,
        timeout_ms
      );
    when method = 'PUT' then
      payload := jsonb_build_object(
        'old_record', OLD,
        'record', NEW,
        'type', TG_OP,
        'table', TG_TABLE_NAME,
        'schema', TG_TABLE_SCHEMA
      );

      select http_put into request_id from net.http_put(
        url,
        payload,
        params,
        headers,
        timeout_ms
      );
    when method = 'PATCH' then
      payload := jsonb_build_object(
        'old_record', OLD,
        'record', NEW,
        'type', TG_OP,
        'table', TG_TABLE_NAME,
        'schema', TG_TABLE_SCHEMA
      );

      select http_patch into request_id from net.http_patch(
        url,
        payload,
        params,
        headers,
        timeout_ms
      );
    when method = 'DELETE' then
      select http_delete into request_id from net.http_delete(
        url,
        params,
        headers,
        timeout_ms
      );
    else
      raise exception 'method argument % is invalid', method;
  end case;

  insert into supabase_functions.hooks
    (hook_table_id, hook_name, request_id)
  values
    (TG_RELID, TG_NAME, request_id);

  return coalesce(NEW, OLD);
end
$$;

-- Supabase dashboard logs
create table if not exists supabase_functions.hooks (
  id bigserial primary key,
  hook_table_id int not null,
  hook_name text not null,
  request_id bigint,
  created_at timestamptz not null default now()
);
