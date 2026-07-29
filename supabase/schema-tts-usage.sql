-- Google Cloud TTS 무료 사용량 보호용 월별 원자 카운터.
-- 서비스 역할만 함수를 호출할 수 있으며, RLS로 직접 테이블 접근을 차단합니다.

create table if not exists public.tts_monthly_usage (
  provider text not null,
  billing_period text not null,
  usage_units bigint not null default 0 check (usage_units >= 0),
  updated_at timestamptz not null default now(),
  primary key (provider, billing_period)
);

alter table public.tts_monthly_usage enable row level security;

revoke all on table public.tts_monthly_usage from public, anon, authenticated;

create or replace function public.reserve_tts_usage(
  p_provider text,
  p_billing_period text,
  p_usage bigint,
  p_limit bigint
)
returns table (
  allowed boolean,
  used bigint,
  remaining bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_used bigint;
begin
  if
    p_provider is null
    or p_provider = ''
    or p_billing_period !~ '^[0-9]{4}-[0-9]{2}$'
    or p_usage <= 0
    or p_limit <= 0
    or p_usage > p_limit
  then
    return query select false, 0::bigint, greatest(p_limit, 0::bigint);
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
  returning usage_units into v_used;

  if v_used is not null then
    return query select true, v_used, greatest(p_limit - v_used, 0::bigint);
    return;
  end if;

  select usage_units
  into v_used
  from public.tts_monthly_usage
  where
    provider = p_provider
    and billing_period = p_billing_period;

  return query
  select false, coalesce(v_used, 0::bigint), greatest(p_limit - coalesce(v_used, 0), 0::bigint);
end;
$$;

revoke all on function public.reserve_tts_usage(text, text, bigint, bigint) from public;
grant execute on function public.reserve_tts_usage(text, text, bigint, bigint) to service_role;
