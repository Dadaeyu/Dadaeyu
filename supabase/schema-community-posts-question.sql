-- tb_community_posts post_type에 question 추가
-- 기존 check 제약을 교체합니다.

alter table public.tb_community_posts
  drop constraint if exists tb_community_posts_post_type_check;

alter table public.tb_community_posts
  add constraint tb_community_posts_post_type_check
  check (post_type in ('review', 'tip', 'share', 'question'));
