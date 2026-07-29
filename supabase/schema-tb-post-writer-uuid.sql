-- tb_post.writer_id를 tb_members.id(uuid)와 매칭되도록 타입 변경.
-- 지금까지 writer_id는 항상 null이었고(bigint로는 auth uuid를 저장할 수 없었음),
-- 작성자 본인/관리자만 게시글을 수정·삭제할 수 있게 하려면 실제 회원 id가 필요하다.

alter table public.tb_post
  alter column writer_id type uuid using writer_id::text::uuid;

alter table public.tb_post
  add constraint fk_tb_post_writer foreign key (writer_id) references public.tb_members(id);

create index if not exists idx_tb_post_writer_id on public.tb_post (writer_id);
