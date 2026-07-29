-- community-media 버킷: 공지/이벤트 본문 이미지
-- 업로드는 관리자 API(service key)로만 수행. 공개 읽기만 허용.

insert into storage.buckets (id, name, public)
values ('community-media', 'community-media', true)
on conflict (id) do nothing;

drop policy if exists "community_media_public_read" on storage.objects;
create policy "community_media_public_read" on storage.objects
  for select using (bucket_id = 'community-media');
