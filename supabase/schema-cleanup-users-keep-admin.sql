-- 회원·인증 데이터 초기화 (관리자 1명만 유지)
-- Supabase SQL Editor에서 실행
--
-- 유지 계정: alianfamily@dadaeyu.com (다대유 관리자)
-- ⚠️ 되돌릴 수 없습니다. 실행 전 백업 권장.

DO $$
DECLARE
  v_admin_id uuid;
BEGIN
  SELECT id INTO v_admin_id
  FROM auth.users
  WHERE lower(email) = 'alianfamily@dadaeyu.com'
  LIMIT 1;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION '관리자 계정(alianfamily@dadaeyu.com)을 auth.users에서 찾을 수 없습니다.';
  END IF;

  -- tb_members 를 참조하는 데이터 (관리자 제외)
  DELETE FROM public.tb_post_likes
  WHERE user_id IS DISTINCT FROM v_admin_id;

  DELETE FROM public.tb_community_comments
  WHERE author_id IS DISTINCT FROM v_admin_id;

  DELETE FROM public.tb_community_posts
  WHERE author_id IS DISTINCT FROM v_admin_id;

  DELETE FROM public.tb_user_favorites
  WHERE user_id IS DISTINCT FROM v_admin_id;

  DELETE FROM public.tb_user_point_events
  WHERE user_id IS DISTINCT FROM v_admin_id;

  DELETE FROM public.tb_place_reports
  WHERE user_id IS DISTINCT FROM v_admin_id;

  -- 코스: 일차·장소는 course_id FK cascade
  DELETE FROM public.tb_courses
  WHERE author_id IS DISTINCT FROM v_admin_id;

  UPDATE public.tb_place_reports
  SET reviewed_by = NULL
  WHERE reviewed_by IS DISTINCT FROM v_admin_id;

  UPDATE public.tb_members
  SET suspended_by = NULL
  WHERE suspended_by IS DISTINCT FROM v_admin_id;

  DELETE FROM public.tb_place_reviews
  WHERE user_id IS NOT NULL AND user_id IS DISTINCT FROM v_admin_id;

  DELETE FROM public.tb_user_preferences
  WHERE user_id IS DISTINCT FROM v_admin_id;

  DELETE FROM public.tb_members
  WHERE id IS DISTINCT FROM v_admin_id;

  -- auth (관리자 제외)
  DELETE FROM auth.identities
  WHERE user_id IS DISTINCT FROM v_admin_id;

  DELETE FROM auth.sessions
  WHERE user_id IS DISTINCT FROM v_admin_id;

  DELETE FROM auth.users
  WHERE id IS DISTINCT FROM v_admin_id;

  RAISE NOTICE '완료. 유지된 관리자 id: %', v_admin_id;
END $$;

-- 확인
SELECT id, email, email_confirmed_at FROM auth.users;
SELECT id, nickname, role, status FROM public.tb_members;
