-- 회원 탈퇴(status=withdrawn) 지원
-- Supabase SQL Editor에서 실행하세요.
-- 실제 제약 이름: members_status_check (레거시) 또는 tb_members_status_check

alter table public.tb_members drop constraint if exists members_status_check;
alter table public.tb_members drop constraint if exists tb_members_status_check;

alter table public.tb_members
  add constraint tb_members_status_check
  check (status in ('active', 'suspended', 'withdrawn'));
