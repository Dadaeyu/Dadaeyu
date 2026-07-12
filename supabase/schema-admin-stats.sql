-- 관리자 대시보드 통계·회원 정지 이력용 스키마 추가
-- Supabase SQL Editor에서 실행하세요.

-- 활동 정지 사유 및 이력 저장
alter table public.tb_members
  add column if not exists suspended_reason text,
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_by uuid references public.tb_members(id);

-- 통계 쿼리용 인덱스
create index if not exists idx_members_created_at on public.tb_members(created_at);
create index if not exists idx_members_role_status on public.tb_members(role, status);
create index if not exists idx_community_posts_created_at on public.tb_community_posts(created_at);
-- idx_community_posts_author may already exist from schema-auth.sql

-- 월별 가입자 뷰 (대시보드 통계용)
create or replace view public.tb_admin_monthly_signups as
select
  date_trunc('month', created_at) as month,
  count(*)::int as count
from public.tb_members
group by 1
order by 1 desc;
