-- Google Cloud TTS 무료 사용량 보호용 원자 카운터.
-- 서비스 역할만 함수를 호출할 수 있으며, RLS로 직접 테이블 접근을 차단합니다.

create table if not exists public.tts_monthly_usage (
  provider text not null,
  billing_period text not null,
  usage_units bigint not null default 0 check (usage_units >= 0),
  updated_at timestamptz not null default now(),
  primary key (provider, billing_period)
);

create table if not exists public.tts_client_daily_usage (
  provider text not null,
  client_period text not null,
  client_key text not null,
  usage_units bigint not null default 0 check (usage_units >= 0),
  updated_at timestamptz not null default now(),
  primary key (provider, client_period, client_key)
);

alter table public.tts_monthly_usage enable row level security;
alter table public.tts_client_daily_usage enable row level security;

revoke all on table public.tts_monthly_usage from public, anon, authenticated;
revoke all on table public.tts_client_daily_usage from public, anon, authenticated;

drop function if exists public.reserve_tts_usage(text, text, bigint, bigint);
drop function if exists public.reserve_tts_usage(text, text, bigint, bigint, text, text, bigint);

create function public.reserve_tts_usage(
  p_provider text,
  p_billing_period text,
  p_usage bigint,
  p_limit bigint,
  p_client_key text,
  p_client_period text,
  p_client_limit bigint
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
  v_monthly_used bigint;
begin
  if
    p_provider is null
    or p_provider = ''
    or p_billing_period is null
    or p_billing_period !~ '^[0-9]{4}-[0-9]{2}$'
    or p_client_period is null
    or p_client_period !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    or p_client_key is null
    or p_client_key !~ '^[a-f0-9]{64}$'
    or p_usage is null
    or p_usage <= 0
    or p_limit is null
    or p_limit <= 0
    or p_client_limit is null
    or p_client_limit <= 0
    or p_usage > p_limit
    or p_usage > p_client_limit
  then
    return query
    select false, 0::bigint, greatest(coalesce(p_limit, 0), 0::bigint), 'invalid';
    return;
  end if;

  insert into public.tts_client_daily_usage (
    provider,
    client_period,
    client_key,
    usage_units,
    updated_at
  )
  values (
    p_provider,
    p_client_period,
    p_client_key,
    p_usage,
    now()
  )
  on conflict (provider, client_period, client_key) do update
  set
    usage_units = public.tts_client_daily_usage.usage_units + excluded.usage_units,
    updated_at = now()
  where public.tts_client_daily_usage.usage_units + excluded.usage_units <= p_client_limit
  returning usage_units into v_client_used;

  if v_client_used is null then
    select usage_units
    into v_client_used
    from public.tts_client_daily_usage
    where
      provider = p_provider
      and client_period = p_client_period
      and client_key = p_client_key;

    return query
    select
      false,
      coalesce(v_client_used, 0::bigint),
      greatest(p_client_limit - coalesce(v_client_used, 0), 0::bigint),
      'client_limit';
    return;
  end if;

  insert into public.tts_monthly_usage (
    provider,
    billing_period,
    usage_units,
    updated_at
  )
  values (
    p_provider,
    p_billing_period,
    p_usage,
    now()
  )
  on conflict (provider, billing_period) do update
  set
    usage_units = public.tts_monthly_usage.usage_units + excluded.usage_units,
    updated_at = now()
  where public.tts_monthly_usage.usage_units + excluded.usage_units <= p_limit
  returning usage_units into v_monthly_used;

  if v_monthly_used is null then
    update public.tts_client_daily_usage
    set
      usage_units = greatest(usage_units - p_usage, 0),
      updated_at = now()
    where
      provider = p_provider
      and client_period = p_client_period
      and client_key = p_client_key;

    select usage_units
    into v_monthly_used
    from public.tts_monthly_usage
    where provider = p_provider and billing_period = p_billing_period;

    return query
    select
      false,
      coalesce(v_monthly_used, 0::bigint),
      greatest(p_limit - coalesce(v_monthly_used, 0), 0::bigint),
      'monthly_limit';
    return;
  end if;

  return query
  select true, v_monthly_used, greatest(p_limit - v_monthly_used, 0::bigint), 'ok';
end;
$$;

revoke all on function public.reserve_tts_usage(
  text,
  text,
  bigint,
  bigint,
  text,
  text,
  bigint
) from public;

grant execute on function public.reserve_tts_usage(
  text,
  text,
  bigint,
  bigint,
  text,
  text,
  bigint
) to service_role;
