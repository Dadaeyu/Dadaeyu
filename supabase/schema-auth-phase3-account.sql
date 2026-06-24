-- 다대유 회원·계정 찾기 3단계
-- 이메일 가입 휴대폰, handle_new_user phone 반영

alter table public.members
  add column if not exists phone text;

create unique index if not exists idx_members_phone_unique
  on public.members (phone) where phone is not null;

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
  user_phone text;
begin
  base_nickname := coalesce(
    nullif(trim(new.raw_user_meta_data->>'nickname'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(split_part(new.email, '@', 1), ''),
    'user_' || left(replace(new.id::text, '-', ''), 8)
  );

  user_phone := nullif(regexp_replace(coalesce(new.raw_user_meta_data->>'phone', ''), '\D', '', 'g'), '');

  final_nickname := base_nickname;
  while exists (select 1 from public.members where nickname = final_nickname) loop
    suffix := suffix + 1;
    final_nickname := base_nickname || '_' || suffix;
  end loop;

  insert into public.members (id, nickname, phone)
  values (new.id, final_nickname, user_phone)
  on conflict (id) do nothing;

  return new;
end;
$$;
