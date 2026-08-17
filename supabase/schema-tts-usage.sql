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

create table if not exists public.tts_usage_reservations (
  reservation_token uuid not null primary key,
  provider text not null,
  billing_period text not null,
  client_period text not null,
  client_key text not null,
  usage_units bigint not null check (usage_units > 0),
  created_at timestamptz not null default now()
);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where
      table_schema = 'public'
      and table_name = 'tts_usage_reservations'
      and column_name = 'refunded_at'
  ) then
    delete from public.tts_usage_reservations
    where refunded_at is not null;

    alter table public.tts_usage_reservations
    drop column refunded_at;
  end if;
end;
$$;

alter table public.tts_monthly_usage enable row level security;
alter table public.tts_client_daily_usage enable row level security;
alter table public.tts_usage_reservations enable row level security;

revoke all on table public.tts_monthly_usage from public, anon, authenticated;
revoke all on table public.tts_client_daily_usage from public, anon, authenticated;
revoke all on table public.tts_usage_reservations from public, anon, authenticated;

drop function if exists public.reserve_tts_usage(text, text, bigint, bigint);
drop function if exists public.reserve_tts_usage(text, text, bigint, bigint, text, text, bigint);
drop function if exists public.reserve_tts_usage(text, text, bigint, bigint, text, text, bigint, uuid);
drop function if exists public.refund_tts_usage(uuid);
drop function if exists public.finalize_tts_usage(uuid);

create function public.reserve_tts_usage(
  p_provider text,
  p_billing_period text,
  p_usage bigint,
  p_limit bigint,
  p_client_key text,
  p_client_period text,
  p_client_limit bigint,
  p_reservation_token uuid
)
returns table (
  allowed boolean,
  used bigint,
  remaining bigint,
  reason text,
  reservation_token uuid
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
    or p_reservation_token is null
  then
    return query
    select
      false,
      0::bigint,
      greatest(coalesce(p_limit, 0), 0::bigint),
      'invalid',
      p_reservation_token;
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
      'client_limit',
      p_reservation_token;
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
      'monthly_limit',
      p_reservation_token;
    return;
  end if;

  insert into public.tts_usage_reservations (
    reservation_token,
    provider,
    billing_period,
    client_period,
    client_key,
    usage_units,
    created_at
  )
  values (
    p_reservation_token,
    p_provider,
    p_billing_period,
    p_client_period,
    p_client_key,
    p_usage,
    now()
  );

  return query
  select
    true,
    v_monthly_used,
    greatest(p_limit - v_monthly_used, 0::bigint),
    'ok',
    p_reservation_token;
end;
$$;

revoke all on function public.reserve_tts_usage(
  text,
  text,
  bigint,
  bigint,
  text,
  text,
  bigint,
  uuid
) from public;

grant execute on function public.reserve_tts_usage(
  text,
  text,
  bigint,
  bigint,
  text,
  text,
  bigint,
  uuid
) to service_role;

create function public.refund_tts_usage(p_reservation_token uuid)
returns table (
  refunded boolean,
  usage bigint,
  reason text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation public.tts_usage_reservations%rowtype;
begin
  if p_reservation_token is null then
    return query select false, 0::bigint, 'invalid';
    return;
  end if;

  select *
  into v_reservation
  from public.tts_usage_reservations
  where reservation_token = p_reservation_token
  for update;

  if not found then
    return query select false, 0::bigint, 'not_found';
    return;
  end if;

  update public.tts_client_daily_usage
  set
    usage_units = greatest(usage_units - v_reservation.usage_units, 0),
    updated_at = now()
  where
    provider = v_reservation.provider
    and client_period = v_reservation.client_period
    and client_key = v_reservation.client_key;

  update public.tts_monthly_usage
  set
    usage_units = greatest(usage_units - v_reservation.usage_units, 0),
    updated_at = now()
  where
    provider = v_reservation.provider
    and billing_period = v_reservation.billing_period;

  delete from public.tts_usage_reservations
  where reservation_token = p_reservation_token;

  return query select true, v_reservation.usage_units, 'ok';
end;
$$;

revoke all on function public.refund_tts_usage(uuid) from public;
grant execute on function public.refund_tts_usage(uuid) to service_role;

create function public.finalize_tts_usage(p_reservation_token uuid)
returns table (
  finalized boolean,
  reason text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted boolean;
begin
  if p_reservation_token is null then
    return query select false, 'invalid';
    return;
  end if;

  delete from public.tts_usage_reservations
  where reservation_token = p_reservation_token
  returning true into v_deleted;

  if v_deleted then
    return query select true, 'ok';
    return;
  end if;

  return query select false, 'not_found';
end;
$$;

revoke all on function public.finalize_tts_usage(uuid) from public;
grant execute on function public.finalize_tts_usage(uuid) to service_role;
