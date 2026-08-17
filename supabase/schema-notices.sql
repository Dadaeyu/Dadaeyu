-- 공지사항 (앱 우선 노출)
-- Supabase SQL Editor에서 실행

-- ── 공지사항 ────────────────────────────────────────────
create table if not exists public.tb_notices (
  id bigint generated always as identity primary key,
  title text not null,
  content text not null,
  is_active boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  priority int not null default 0,
  created_by uuid references public.tb_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_notices_active on public.tb_notices(is_active);
create index if not exists idx_notices_priority on public.tb_notices(priority);

-- updated_at 자동 갱신 (schema-auth.sql 의 set_updated_at 재사용)
drop trigger if exists notices_updated_at on public.tb_notices;
create trigger notices_updated_at
  before update on public.tb_notices
  for each row execute function public.set_updated_at();

-- ── RLS ────────────────────────────────────────────────
alter table public.tb_notices enable row level security;

-- 활성 공지는 비로그인 포함 공개 조회 (앱 모달 노출)
drop policy if exists "notices_select_public" on public.tb_notices;
create policy "notices_select_public" on public.tb_notices
  for select using (true);

-- 쓰기는 앱 클라이언트에서 금지 (관리자 API는 service key로 우회)
drop policy if exists "notices_write_none" on public.tb_notices;
create policy "notices_write_none" on public.tb_notices
  for all using (false) with check (false);

