-- Chat API provider 호출 전 요청량 보호용 원자 카운터.
-- 서비스 역할만 함수를 호출할 수 있으며, RLS로 직접 테이블 접근을 차단합니다.

create table if not exists public.chat_monthly_global_usage (
  global_period text not null primary key,
  request_count bigint not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_client_daily_usage (
  client_period text not null,
  client_key text not null,
  request_count bigint not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (client_period, client_key)
);

alter table public.chat_monthly_global_usage enable row level security;
alter table public.chat_client_daily_usage enable row level security;

revoke all on table public.chat_monthly_global_usage from public, anon, authenticated;
revoke all on table public.chat_client_daily_usage from public, anon, authenticated;

drop function if exists public.reserve_chat_usage(text, bigint, text, bigint, bigint);
drop function if exists public.reserve_chat_usage(text, text, bigint, text, bigint, bigint);

create function public.reserve_chat_usage(
  p_client_key text,
  p_client_period text,
  p_client_limit bigint,
  p_global_period text,
  p_global_limit bigint,
  p_usage bigint default 1
)
returns table (
  allowed boolean,
  used bigint,
  remaining bigint,
  reason text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client_used bigint;
  v_global_used bigint;
begin
  if
    p_client_period is null
    or p_client_period !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    or p_global_period is null
    or p_global_period !~ '^[0-9]{4}-[0-9]{2}$'
    or p_client_key is null
    or p_client_key !~ '^[a-f0-9]{64}$'
    or p_usage is null
    or p_usage <= 0
    or p_client_limit is null
    or p_client_limit <= 0
    or p_global_limit is null
    or p_global_limit <= 0
    or p_usage > p_client_limit
    or p_usage > p_global_limit
  then
    return query
    select false, 0::bigint, greatest(coalesce(p_global_limit, 0), 0::bigint), 'invalid';
    return;
  end if;

  insert into public.chat_client_daily_usage (
    client_period,
    client_key,
    request_count,
    updated_at
  )
  values (
    p_client_period,
    p_client_key,
    p_usage,
    now()
  )
  on conflict (client_period, client_key) do update
  set
    request_count = public.chat_client_daily_usage.request_count + excluded.request_count,
    updated_at = now()
  where public.chat_client_daily_usage.request_count + excluded.request_count <= p_client_limit
  returning request_count into v_client_used;

  if v_client_used is null then
    select request_count
    into v_client_used
    from public.chat_client_daily_usage
    where client_period = p_client_period and client_key = p_client_key;

    return query
    select
      false,
      coalesce(v_client_used, 0::bigint),
      greatest(p_client_limit - coalesce(v_client_used, 0), 0::bigint),
      'client_limit';
    return;
  end if;

  insert into public.chat_monthly_global_usage (
    global_period,
    request_count,
    updated_at
  )
  values (
    p_global_period,
    p_usage,
    now()
  )
  on conflict (global_period) do update
  set
    request_count = public.chat_monthly_global_usage.request_count + excluded.request_count,
    updated_at = now()
  where public.chat_monthly_global_usage.request_count + excluded.request_count <= p_global_limit
  returning request_count into v_global_used;

  if v_global_used is null then
    update public.chat_client_daily_usage
    set
      request_count = greatest(request_count - p_usage, 0),
      updated_at = now()
    where client_period = p_client_period and client_key = p_client_key;

    select request_count
    into v_global_used
    from public.chat_monthly_global_usage
    where global_period = p_global_period;

    return query
    select
      false,
      coalesce(v_global_used, 0::bigint),
      greatest(p_global_limit - coalesce(v_global_used, 0), 0::bigint),
      'global_limit';
    return;
  end if;

  return query
  select true, v_global_used, greatest(p_global_limit - v_global_used, 0::bigint), 'ok';
end;
$$;

revoke all on function public.reserve_chat_usage(
  text,
  text,
  bigint,
  text,
  bigint,
  bigint
) from public;

grant execute on function public.reserve_chat_usage(
  text,
  text,
  bigint,
  text,
  bigint,
  bigint
) to service_role;
