-- 다대유 회원·로그인 2단계 — 접근성·선호 테마
-- schema-auth-phase1.sql 적용 후 실행하세요.

-- ── user_preferences ────────────────────────────────────
create table if not exists public.user_preferences (
  user_id uuid primary key references public.members(id) on delete cascade,
  accessibility_needs text[] not null default '{}',
  theme_preferences text[] not null default '{}',
  dark_mode boolean not null default false,
  high_contrast boolean not null default false,
  font_scale int not null default 100 check (font_scale between 100 and 200),
  read_aloud boolean not null default false,
  updated_at timestamptz not null default now()
);

drop trigger if exists user_preferences_updated_at on public.user_preferences;
create trigger user_preferences_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();

-- 기존 회원에게 preferences 행 보충
insert into public.user_preferences (user_id)
select id from public.members
on conflict (user_id) do nothing;

-- 가입 트리거: members + preferences 동시 생성
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_nickname text;
  final_nickname text;
  suffix int := 0;
begin
  base_nickname := coalesce(
    nullif(trim(new.raw_user_meta_data->>'nickname'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(split_part(new.email, '@', 1), ''),
    'user_' || left(replace(new.id::text, '-', ''), 8)
  );

  final_nickname := base_nickname;
  while exists (select 1 from public.members where nickname = final_nickname) loop
    suffix := suffix + 1;
    final_nickname := base_nickname || '_' || suffix;
  end loop;

  insert into public.members (id, nickname)
  values (new.id, final_nickname)
  on conflict (id) do nothing;

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- ── RLS ─────────────────────────────────────────────────
alter table public.user_preferences enable row level security;

drop policy if exists "prefs_select_own" on public.user_preferences;
create policy "prefs_select_own" on public.user_preferences
  for select using (auth.uid() = user_id);

drop policy if exists "prefs_upsert_own" on public.user_preferences;
create policy "prefs_upsert_own" on public.user_preferences
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
