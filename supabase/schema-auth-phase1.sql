-- 다대유 회원·로그인 1단계
-- Supabase SQL Editor에서 이 파일만 실행하세요.
-- (places 등 장소 테이블 없이도 동작합니다)

-- ── Step 0: updated_at 헬퍼 ───────────────────────────
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ── Step 1: members ────────────────────────────────────
create table if not exists public.members (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  avatar_url text,
  gender text not null default 'undisclosed'
    check (gender in ('male', 'female', 'undisclosed')),
  age_group text check (age_group in ('10s', '20s', '30s', '40s', '50s_plus')),
  role text not null default 'user' check (role in ('user', 'admin')),
  status text not null default 'active' check (status in ('active', 'suspended')),
  community_points int not null default 0 check (community_points >= 0),
  community_level int not null default 1,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint members_nickname_unique unique (nickname)
);

create index if not exists idx_members_role on public.members(role);
create index if not exists idx_members_status on public.members(status);

drop trigger if exists members_updated_at on public.members;
create trigger members_updated_at
  before update on public.members
  for each row execute function public.set_updated_at();

-- ── Step 2: 가입 시 members 자동 생성 ──────────────────
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

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Step 3: RLS ─────────────────────────────────────────
alter table public.members enable row level security;

drop policy if exists "members_select_public" on public.members;
create policy "members_select_public" on public.members
  for select using (true);

drop policy if exists "members_update_own" on public.members;
create policy "members_update_own" on public.members
  for update using (auth.uid() = id and status = 'active')
  with check (
    auth.uid() = id
    and role = (select m.role from public.members m where m.id = auth.uid())
  );
