-- 이벤트 등록 UI: 썸네일·기간(달력) 지원
-- Supabase SQL Editor에서 실행하세요.

alter table public.tb_community_events
  add column if not exists cover_image_url text;

alter table public.tb_community_events
  add column if not exists period_start date;

alter table public.tb_community_events
  add column if not exists period_end date;
