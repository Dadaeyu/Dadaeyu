-- 다대유 Supabase 스키마
-- Supabase 대시보드 > SQL Editor 에서 실행하세요.

-- 장소
create table if not exists public.places (
  id bigint primary key,
  name text not null,
  lat numeric not null,
  lng numeric not null,
  cx numeric not null,
  cy numeric not null,
  color text not null default '#7c3aed',
  bg text not null default '#ede9fe',
  category text not null,
  rating numeric(2,1) not null default 0,
  accessibility text[] not null default '{}',
  distance text,
  emoji text,
  hot boolean not null default false,
  description text,
  tags text[] default '{}',
  address text,
  hours text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 장소 리뷰
create table if not exists public.place_reviews (
  id bigint generated always as identity primary key,
  place_id bigint not null references public.places(id) on delete cascade,
  user_name text not null,
  rating int not null check (rating between 1 and 5),
  content text not null,
  review_date text not null,
  created_at timestamptz not null default now()
);

-- 인덱스
create index if not exists idx_places_category on public.places(category);
create index if not exists idx_places_hot on public.places(hot);
create index if not exists idx_place_reviews_place_id on public.place_reviews(place_id);

-- RLS
alter table public.places enable row level security;
alter table public.place_reviews enable row level security;

create policy "장소 공개 읽기" on public.places
  for select using (true);

create policy "리뷰 공개 읽기" on public.place_reviews
  for select using (true);

-- updated_at 자동 갱신
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists places_updated_at on public.places;
create trigger places_updated_at
  before update on public.places
  for each row execute function public.set_updated_at();

-- 기존 테이블에 lat/lng 추가 (이미 places 테이블이 있는 경우)
alter table public.places add column if not exists lat numeric;
alter table public.places add column if not exists lng numeric;
