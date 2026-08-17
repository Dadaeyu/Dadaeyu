-- 기존 Supabase DB 테이블명에 tb_ 접두사 적용 (1회 실행)
-- 적용 후 아래 SQL 파일에서 함수·뷰·정책 정의를 재실행하세요.
--   - supabase/schema-auth.sql (함수·RLS 구간)
--   - supabase/schema-auth-phase4-email-verify.sql
--   - supabase/schema-admin-stats.sql

begin;

drop view if exists public.admin_monthly_signups;
drop view if exists public.tb_admin_monthly_signups;

-- 자식 테이블부터 rename (PostgreSQL은 FK와 무관하게 rename 가능)
alter table if exists public.post_likes rename to tb_post_likes;
alter table if exists public.community_comments rename to tb_community_comments;
alter table if exists public.course_day_places rename to tb_course_day_places;
alter table if exists public.course_days rename to tb_course_days;
alter table if exists public.community_posts rename to tb_community_posts;
alter table if exists public.place_reports rename to tb_place_reports;
alter table if exists public.user_favorites rename to tb_user_favorites;
alter table if exists public.user_point_events rename to tb_user_point_events;
alter table if exists public.user_preferences rename to tb_user_preferences;
alter table if exists public.place_reviews rename to tb_place_reviews;
alter table if exists public.courses rename to tb_courses;
alter table if exists public.places rename to tb_places;
alter table if exists public.members rename to tb_members;

commit;

-- 다음 단계 (필수): supabase/schema-fix-tb-functions.sql 실행
-- 뷰·나머지 RLS: schema-auth.sql · schema-admin-stats.sql 재실행
