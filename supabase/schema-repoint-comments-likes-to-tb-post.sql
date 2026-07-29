-- tb_community_comments / tb_post_likes 의 post_id FK를 tb_community_posts에서
-- tb_post(새 게시판 체계)로 재지정한다. 두 테이블 모두 현재 데이터가 없어 안전하게 변경 가능.
-- (커뮤니티 게시판 글쓰기/목록/상세는 이미 tb_community_posts 대신 tb_post를 사용 중)

alter table public.tb_community_comments
  drop constraint tb_community_comments_post_id_fkey;

alter table public.tb_community_comments
  add constraint tb_community_comments_post_id_fkey
  foreign key (post_id) references public.tb_post (post_id) on delete cascade;

alter table public.tb_post_likes
  drop constraint tb_post_likes_post_id_fkey;

alter table public.tb_post_likes
  add constraint tb_post_likes_post_id_fkey
  foreign key (post_id) references public.tb_post (post_id) on delete cascade;
