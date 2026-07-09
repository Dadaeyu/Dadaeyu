-- 다대유 회원·로그인 2단계 — 접근성·선호 테마
-- schema-auth-phase1.sql 적용 후 실행하세요.

-- ── user_preferences ────────────────────────────────────
create table if not exists public.tb_user_preferences (
  user_id uuid primary key references public.tb_members(id) on delete cascade,
  accessibility_needs text[] not null default '{}',
  theme_preferences text[] not null default '{}',
  dark_mode boolean not null default false,
  high_contrast boolean not null default false,
  font_scale int not null default 100 check (font_scale between 100 and 200),
  read_aloud boolean not null default false,
  updated_at timestamptz not null default now()
);

drop trigger if exists user_preferences_updated_at on public.tb_user_preferences;
create trigger user_preferences_updated_at
  before update on public.tb_user_preferences
  for each row execute function public.set_updated_at();

-- 기존 회원에게 preferences 행 보충
insert into public.tb_user_preferences (user_id)
select id from public.tb_members
on conflict (user_id) do nothing;

-- 가입 트리거는 schema-auth-phase4-email-verify.sql 에서 정의합니다.
-- (이메일 미인증 가입 시 members 미생성, OAuth·인증 완료 시 생성)

-- ── RLS ─────────────────────────────────────────────────
alter table public.tb_user_preferences enable row level security;

drop policy if exists "prefs_select_own" on public.tb_user_preferences;
create policy "prefs_select_own" on public.tb_user_preferences
  for select using (auth.uid() = user_id);

drop policy if exists "prefs_upsert_own" on public.tb_user_preferences;
create policy "prefs_upsert_own" on public.tb_user_preferences
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
