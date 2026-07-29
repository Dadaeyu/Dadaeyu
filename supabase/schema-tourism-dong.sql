-- tb_tourism_places에 법정동 이름 컬럼 추가.
-- 공공데이터포털 관광 API는 시도/시군구 코드까지만 제공하므로,
-- 좌표(mapx, mapy)를 카카오 좌표→행정구역 API로 역지오코딩해 채운다.
-- 채우기: POST /api/tourism/geocode-dong (scripts/geocode-dong.mjs 참고)

alter table public.tb_tourism_places
  add column if not exists dong text null;

create index if not exists idx_tourism_places_dong on public.tb_tourism_places (dong);
