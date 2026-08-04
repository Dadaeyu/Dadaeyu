-- 게시글 이미지/파일 첨부 (tb_board.allow_image, allow_file, max_upload_count 연동)
-- 실제 파일은 Supabase Storage "postImg" 버킷에 업로드하고, 여기엔 공개 URL만 저장한다.

create table public.tb_post_image (
  image_id bigint generated always as identity primary key,
  post_id bigint not null references public.tb_post (post_id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_post_image_post_id on public.tb_post_image (post_id);

create table public.tb_post_file (
  file_id bigint generated always as identity primary key,
  post_id bigint not null references public.tb_post (post_id) on delete cascade,
  file_url text not null,
  file_name text not null,
  file_size bigint,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_post_file_post_id on public.tb_post_file (post_id);

-- ── Storage: postImg ────────────────────────────────────
-- 업로드 경로는 upload/route.ts에서 `${user.id}/${uuid}` 형태로 만든다(avatars와 동일한 규칙).
insert into storage.buckets (id, name, public)
values ('postImg', 'postImg', true)
on conflict (id) do nothing;

drop policy if exists "postimg_public_read" on storage.objects;
create policy "postimg_public_read" on storage.objects
  for select using (bucket_id = 'postImg');

drop policy if exists "postimg_upload_own" on storage.objects;
create policy "postimg_upload_own" on storage.objects
  for insert with check (
    bucket_id = 'postImg'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "postimg_update_own" on storage.objects;
create policy "postimg_update_own" on storage.objects
  for update using (
    bucket_id = 'postImg'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "postimg_delete_own" on storage.objects;
create policy "postimg_delete_own" on storage.objects
  for delete using (
    bucket_id = 'postImg'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
