-- 장소 동기화(cron/place) 진행 상태를 DB에 저장한다.
-- 기존에는 자기 자신을 fetch로 호출해 체이닝했는데, 응답을 8초만 기다리고 끊어버리는 구조라
-- 실제 배포 환경에서 몇 회차 못 가 끊기는 문제가 있었다. 이제 커서를 URL이 아니라 이 테이블에
-- 저장해, 외부 스케줄러(cron-job.org 등)가 짧은 간격으로 이 엔드포인트를 반복 호출하는 방식으로
-- 바꾼다 — 각 호출이 완전히 독립적이라 "직전 호출이 다음 호출을 살려두는지" 같은 불확실성이 없다.
--
-- done 플래그: 그날 detail/barrierfree/normalize 가 전부 끝나면 true 로 세운다. 짧은 간격(예: 1분)
-- 으로 계속 불려도, done 이면 place/bakery 전체 재조회 같은 무거운 작업을 다시 하지 않고 즉시
-- 반환한다 — 그렇지 않으면 그날 할 일이 다 끝난 뒤에도 다음날까지 매분 쓸데없이 외부 API를
-- 반복 호출하게 된다.

create table if not exists public.tb_place_sync_state (
  id text primary key,
  sync_date date not null,
  detail_cursor integer not null default 0,
  barrierfree_cursor integer not null default 0,
  normalize_cursor integer not null default 0,
  lock_started_at timestamptz,
  updated_at timestamptz not null default now()
);

-- 이전에 done 컬럼 없이 먼저 만들어진 테이블에도 안전하게 추가되도록 별도 alter 로 둔다.
alter table public.tb_place_sync_state add column if not exists done boolean not null default false;

alter table public.tb_place_sync_state enable row level security;
revoke all on table public.tb_place_sync_state from public, anon, authenticated;

-- 동시에 여러 호출이 겹쳐도 한 번에 하나만 실제로 처리하도록 락을 잡는다.
-- 진행 중인 락이 stale_seconds 보다 오래됐으면(예: 이전 실행이 죽어서 락을 못 풀었으면)
-- 새로 잡을 수 있게 한다. 새 날짜가 되면 커서와 done 을 초기화한다(매일 처음부터).
-- done 이 이미 true 면(오늘 치 끝남) 락도 건드리지 않고 바로 claimed=false, done=true 로 반환한다.
drop function if exists public.place_sync_claim(integer);

create function public.place_sync_claim(p_stale_seconds integer default 90)
returns table (
  claimed boolean,
  done boolean,
  detail_cursor integer,
  barrierfree_cursor integer,
  normalize_cursor integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_row public.tb_place_sync_state;
begin
  insert into public.tb_place_sync_state (id, sync_date)
  values ('place', v_today)
  on conflict (id) do nothing;

  select * into v_row from public.tb_place_sync_state where id = 'place' for update;

  if v_row.sync_date <> v_today then
    update public.tb_place_sync_state
    set
      sync_date = v_today,
      detail_cursor = 0,
      barrierfree_cursor = 0,
      normalize_cursor = 0,
      done = false,
      lock_started_at = null,
      updated_at = now()
    where id = 'place'
    returning * into v_row;
  end if;

  if v_row.done then
    return query select false, true, v_row.detail_cursor, v_row.barrierfree_cursor, v_row.normalize_cursor;
    return;
  end if;

  if v_row.lock_started_at is not null
     and now() - v_row.lock_started_at < make_interval(secs => p_stale_seconds) then
    return query select false, false, v_row.detail_cursor, v_row.barrierfree_cursor, v_row.normalize_cursor;
    return;
  end if;

  update public.tb_place_sync_state
  set lock_started_at = now(), updated_at = now()
  where id = 'place';

  return query select true, false, v_row.detail_cursor, v_row.barrierfree_cursor, v_row.normalize_cursor;
end;
$$;

drop function if exists public.place_sync_release(integer, integer, integer);
drop function if exists public.place_sync_release(integer, integer, integer, boolean);

create function public.place_sync_release(
  p_detail_cursor integer,
  p_barrierfree_cursor integer,
  p_normalize_cursor integer,
  p_done boolean
)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.tb_place_sync_state
  set
    detail_cursor = p_detail_cursor,
    barrierfree_cursor = p_barrierfree_cursor,
    normalize_cursor = p_normalize_cursor,
    done = p_done,
    lock_started_at = null,
    updated_at = now()
  where id = 'place';
$$;

revoke all on function public.place_sync_claim(integer) from public;
revoke all on function public.place_sync_release(integer, integer, integer, boolean) from public;
grant execute on function public.place_sync_claim(integer) to service_role;
grant execute on function public.place_sync_release(integer, integer, integer, boolean) to service_role;
