-- tb_post에 첨부 장소(tb_place.contentid 참조) 컬럼 추가.
-- 게시글 작성 시 선택한 관광지의 contentid를 저장해, 게시글 상세에서 장소 카드로 보여주고
-- 지도 화면(/map?contentId=)으로 이동해 마커를 찍는 데 사용한다.

alter table public.tb_post
  add column if not exists content_id bigint null;

create index if not exists idx_tb_post_content_id on public.tb_post (content_id);
