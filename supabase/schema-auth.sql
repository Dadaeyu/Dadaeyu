-- 다대유 회원·인증 스키마
-- schema.sql 적용 후 SQL Editor에서 실행하세요.

-- ── ENUM ──────────────────────────────────────────────
do $$ begin
  create type public.report_status as enum ('pending', 'reviewing', 'approved', 'rejected');
exception
  when duplicate_object then null;
end $$;

-- ── members ──────────────────────────────────────────
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

-- ── user_favorites ────────────────────────────────────
create table if not exists public.user_favorites (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.members(id) on delete cascade,
  target_type text not null check (target_type in ('place', 'course')),
  target_id bigint not null,
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);

create index if not exists idx_favorites_user on public.user_favorites(user_id, target_type);

-- ── user_point_events ───────────────────────────────────
create table if not exists public.user_point_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.members(id) on delete cascade,
  amount int not null,
  reason text not null,
  ref_type text,
  ref_id bigint,
  created_at timestamptz not null default now()
);

create index if not exists idx_point_events_user on public.user_point_events(user_id);

-- ── courses ─────────────────────────────────────────────
create table if not exists public.courses (
  id bigint generated always as identity primary key,
  author_id uuid references public.members(id) on delete set null,
  title text not null,
  description text,
  duration_label text,
  is_public boolean not null default false,
  is_best boolean not null default false,
  like_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_courses_author on public.courses(author_id);

create table if not exists public.course_days (
  id bigint generated always as identity primary key,
  course_id bigint not null references public.courses(id) on delete cascade,
  day_number int not null,
  unique (course_id, day_number)
);

create table if not exists public.course_day_places (
  id bigint generated always as identity primary key,
  course_day_id bigint not null references public.course_days(id) on delete cascade,
  place_id bigint references public.places(id) on delete set null,
  place_name text not null,
  visit_time time,
  duration_label text,
  sort_order int not null default 0
);

-- ── community ───────────────────────────────────────────
create table if not exists public.community_posts (
  id bigint generated always as identity primary key,
  author_id uuid not null references public.members(id) on delete cascade,
  post_type text not null check (post_type in ('review', 'tip', 'share')),
  title text not null,
  content text not null,
  attached_place_id bigint references public.places(id) on delete set null,
  attached_course_id bigint references public.courses(id) on delete set null,
  like_count int not null default 0,
  comment_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_community_posts_author on public.community_posts(author_id);

create table if not exists public.community_comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.community_posts(id) on delete cascade,
  author_id uuid not null references public.members(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.post_likes (
  user_id uuid not null references public.members(id) on delete cascade,
  post_id bigint not null references public.community_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

-- ── place_reports ───────────────────────────────────────
create table if not exists public.place_reports (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.members(id) on delete cascade,
  place_id bigint references public.places(id) on delete set null,
  target_name text not null,
  content text not null,
  status public.report_status not null default 'pending',
  points_awarded int not null default 0,
  admin_note text,
  reviewed_by uuid references public.members(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_place_reports_user on public.place_reports(user_id);
create index if not exists idx_place_reports_status on public.place_reports(status);

-- ── place_reviews 확장 ──────────────────────────────────
alter table public.place_reviews
  add column if not exists user_id uuid references public.members(id) on delete set null;

-- ── updated_at 트리거 (members, courses, community_posts) ─
drop trigger if exists members_updated_at on public.members;
create trigger members_updated_at
  before update on public.members
  for each row execute function public.set_updated_at();

drop trigger if exists courses_updated_at on public.courses;
create trigger courses_updated_at
  before update on public.courses
  for each row execute function public.set_updated_at();

drop trigger if exists community_posts_updated_at on public.community_posts;
create trigger community_posts_updated_at
  before update on public.community_posts
  for each row execute function public.set_updated_at();

drop trigger if exists user_preferences_updated_at on public.user_preferences;
create trigger user_preferences_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();

-- ── 가입 시 members + preferences 자동 생성 ────────────
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── 커뮤니티 레벨 계산 ──────────────────────────────────
create or replace function public.calc_community_level(points int)
returns int
language sql
immutable
as $$
  select case
    when points >= 1000 then 5
    when points >= 500 then 4
    when points >= 200 then 3
    when points >= 50 then 2
    else 1
  end;
$$;

-- ── 포인트 이벤트 → members 갱신 ───────────────────────
create or replace function public.apply_point_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_points int;
begin
  update public.members
  set
    community_points = community_points + new.amount,
    updated_at = now()
  where id = new.user_id
  returning community_points into new_points;

  update public.members
  set community_level = public.calc_community_level(new_points)
  where id = new.user_id;

  return new;
end;
$$;

drop trigger if exists on_point_event_insert on public.user_point_events;
create trigger on_point_event_insert
  after insert on public.user_point_events
  for each row execute function public.apply_point_event();

-- ── 제보 승인 시 포인트 부여 ────────────────────────────
create or replace function public.award_report_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved'
     and (old.status is distinct from 'approved')
     and new.points_awarded = 0 then
    new.points_awarded := 30;
    insert into public.user_point_events (user_id, amount, reason, ref_type, ref_id)
    values (new.user_id, 30, 'report_approved', 'report', new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists on_report_approved on public.place_reports;
create trigger on_report_approved
  before update on public.place_reports
  for each row execute function public.award_report_points();

-- ── RLS 헬퍼 ────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.members
    where id = auth.uid() and role = 'admin' and status = 'active'
  );
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.members
    where id = auth.uid() and status = 'active'
  );
$$;

-- ── RLS 활성화 ──────────────────────────────────────────
alter table public.members enable row level security;
alter table public.user_preferences enable row level security;
alter table public.user_favorites enable row level security;
alter table public.user_point_events enable row level security;
alter table public.courses enable row level security;
alter table public.course_days enable row level security;
alter table public.course_day_places enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.post_likes enable row level security;
alter table public.place_reports enable row level security;

-- members
drop policy if exists "members_select_public" on public.members;
create policy "members_select_public" on public.members
  for select using (true);

drop policy if exists "members_update_own" on public.members;
create policy "members_update_own" on public.members
  for update using (auth.uid() = id and status = 'active')
  with check (auth.uid() = id and role = (select m.role from public.members m where m.id = auth.uid()));

-- user_preferences
drop policy if exists "prefs_select_own" on public.user_preferences;
create policy "prefs_select_own" on public.user_preferences
  for select using (auth.uid() = user_id);

drop policy if exists "prefs_upsert_own" on public.user_preferences;
create policy "prefs_upsert_own" on public.user_preferences
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- user_favorites
drop policy if exists "favorites_own" on public.user_favorites;
create policy "favorites_own" on public.user_favorites
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- user_point_events
drop policy if exists "points_select_own" on public.user_point_events;
create policy "points_select_own" on public.user_point_events
  for select using (auth.uid() = user_id);

-- courses
drop policy if exists "courses_select" on public.courses;
create policy "courses_select" on public.courses
  for select using (is_public = true or author_id = auth.uid() or public.is_admin());

drop policy if exists "courses_mutate_own" on public.courses;
create policy "courses_mutate_own" on public.courses
  for all using (author_id = auth.uid())
  with check (author_id = auth.uid());

drop policy if exists "course_days_via_course" on public.course_days;
drop policy if exists "course_days_select" on public.course_days;
create policy "course_days_select" on public.course_days
  for select using (
    exists (
      select 1 from public.courses c
      where c.id = course_id
        and (c.is_public = true or c.author_id = auth.uid() or public.is_admin())
    )
  );

create policy "course_days_mutate" on public.course_days
  for all using (
    exists (
      select 1 from public.courses c
      where c.id = course_id and (c.author_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.courses c
      where c.id = course_id and (c.author_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "course_day_places_via_course" on public.course_day_places;
drop policy if exists "course_day_places_select" on public.course_day_places;
create policy "course_day_places_select" on public.course_day_places
  for select using (
    exists (
      select 1 from public.course_days d
      join public.courses c on c.id = d.course_id
      where d.id = course_day_id
        and (c.is_public = true or c.author_id = auth.uid() or public.is_admin())
    )
  );

create policy "course_day_places_mutate" on public.course_day_places
  for all using (
    exists (
      select 1 from public.course_days d
      join public.courses c on c.id = d.course_id
      where d.id = course_day_id and (c.author_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.course_days d
      join public.courses c on c.id = d.course_id
      where d.id = course_day_id and (c.author_id = auth.uid() or public.is_admin())
    )
  );

-- community
drop policy if exists "posts_select" on public.community_posts;
create policy "posts_select" on public.community_posts
  for select using (true);

drop policy if exists "posts_mutate_own" on public.community_posts;
create policy "posts_mutate_own" on public.community_posts
  for all using (author_id = auth.uid())
  with check (author_id = auth.uid());

drop policy if exists "comments_select" on public.community_comments;
create policy "comments_select" on public.community_comments
  for select using (true);

drop policy if exists "comments_mutate_own" on public.community_comments;
create policy "comments_mutate_own" on public.community_comments
  for all using (author_id = auth.uid())
  with check (author_id = auth.uid());

drop policy if exists "post_likes_own" on public.post_likes;
create policy "post_likes_own" on public.post_likes
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- place_reports
drop policy if exists "reports_select" on public.place_reports;
create policy "reports_select" on public.place_reports
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "reports_insert_own" on public.place_reports;
create policy "reports_insert_own" on public.place_reports
  for insert with check (auth.uid() = user_id);

drop policy if exists "reports_admin_update" on public.place_reports;
create policy "reports_admin_update" on public.place_reports
  for update using (public.is_admin());

-- place_reviews (로그인 사용자 작성)
drop policy if exists "리뷰 공개 읽기" on public.place_reviews;
create policy "리뷰 공개 읽기" on public.place_reviews
  for select using (true);

drop policy if exists "reviews_insert_auth" on public.place_reviews;
create policy "reviews_insert_auth" on public.place_reviews
  for insert with check (auth.uid() = user_id);

drop policy if exists "reviews_update_own" on public.place_reviews;
create policy "reviews_update_own" on public.place_reviews
  for update using (auth.uid() = user_id);

drop policy if exists "reviews_delete_own" on public.place_reviews;
create policy "reviews_delete_own" on public.place_reviews
  for delete using (auth.uid() = user_id);

-- ── Storage: avatars ────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars_upload_own" on storage.objects;
create policy "avatars_upload_own" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
