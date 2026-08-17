-- tb_ 테이블 리네임 후 필수: DB 함수·트리거를 tb_members 등으로 갱신
-- schema-rename-tb-migration.sql 실행 후 이 파일을 SQL Editor에서 실행하세요.
-- 그 다음 schema-admin-confirm-user.sql (관리자 이메일 인증) 실행

-- ── insert_member_for_auth_user (phase4) ─────────────────
create or replace function public.insert_member_for_auth_user(p_user auth.users)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  base_nickname text;
  final_nickname text;
  suffix int := 0;
  user_phone text;
begin
  base_nickname := coalesce(
    nullif(trim(p_user.raw_user_meta_data->>'nickname'), ''),
    nullif(trim(p_user.raw_user_meta_data->>'name'), ''),
    nullif(trim(p_user.raw_user_meta_data->>'full_name'), ''),
    nullif(split_part(p_user.email, '@', 1), ''),
    'user_' || left(replace(p_user.id::text, '-', ''), 8)
  );

  user_phone := nullif(
    regexp_replace(coalesce(p_user.raw_user_meta_data->>'phone', ''), '\D', '', 'g'),
    ''
  );

  if exists (select 1 from public.tb_members where id = p_user.id) then
    if user_phone is not null then
      update public.tb_members
      set phone = user_phone
      where id = p_user.id and phone is null;
    end if;

    insert into public.tb_user_preferences (user_id)
    values (p_user.id)
    on conflict (user_id) do nothing;

    return;
  end if;

  final_nickname := base_nickname;
  while exists (select 1 from public.tb_members where nickname = final_nickname) loop
    suffix := suffix + 1;
    final_nickname := base_nickname || '_' || suffix;
  end loop;

  insert into public.tb_members (id, nickname, phone)
  values (p_user.id, final_nickname, user_phone)
  on conflict (id) do nothing;

  insert into public.tb_user_preferences (user_id)
  values (p_user.id)
  on conflict (user_id) do nothing;
end;
$$;

-- ── 가입·이메일 인증 트리거 (phase4) ─────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  auth_provider text;
begin
  auth_provider := coalesce(new.raw_app_meta_data->>'provider', 'email');

  if new.email_confirmed_at is not null or auth_provider <> 'email' then
    perform public.insert_member_for_auth_user(new);
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    perform public.insert_member_for_auth_user(new);
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_email_confirmed on auth.users;
create trigger on_auth_user_email_confirmed
  after update of email_confirmed_at on auth.users
  for each row execute function public.handle_user_email_confirmed();

-- ── RLS·포인트 헬퍼 (schema-auth.sql) ────────────────────
create or replace function public.apply_point_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_points int;
begin
  update public.tb_members
  set
    community_points = community_points + new.amount,
    updated_at = now()
  where id = new.user_id
  returning community_points into new_points;

  update public.tb_members
  set community_level = public.calc_community_level(new_points)
  where id = new.user_id;

  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.tb_members
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
    select 1 from public.tb_members
    where id = auth.uid() and status = 'active'
  );
$$;
