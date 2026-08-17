-- 커뮤니티 공지사항 / 이벤트 / FAQ
-- Supabase SQL Editor에서 실행 (schema-auth.sql, set_updated_at 이후)

-- ── 커뮤니티 공지사항 ─────────────────────────────────────
create table if not exists public.tb_community_notices (
  id bigint generated always as identity primary key,
  title text not null,
  content text not null default '',
  pinned boolean not null default false,
  is_visible boolean not null default true,
  published_at timestamptz not null default now(),
  sort_order int not null default 0,
  created_by uuid references public.tb_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_community_notices_visible on public.tb_community_notices(is_visible);
create index if not exists idx_community_notices_published on public.tb_community_notices(published_at desc);

drop trigger if exists community_notices_updated_at on public.tb_community_notices;
create trigger community_notices_updated_at
  before update on public.tb_community_notices
  for each row execute function public.set_updated_at();

alter table public.tb_community_notices enable row level security;

drop policy if exists "community_notices_select_visible" on public.tb_community_notices;
create policy "community_notices_select_visible" on public.tb_community_notices
  for select using (is_visible = true);

drop policy if exists "community_notices_write_none" on public.tb_community_notices;
create policy "community_notices_write_none" on public.tb_community_notices
  for all using (false) with check (false);

-- ── 커뮤니티 이벤트 ───────────────────────────────────────
create table if not exists public.tb_community_events (
  id bigint generated always as identity primary key,
  title text not null,
  summary text not null default '',
  content text not null default '',
  emoji text not null default '🎉',
  badge_label text not null default '',
  badge_color text not null default 'bg-brand-100 text-brand-700',
  cover_gradient text not null default 'from-brand-400 to-brand-500',
  cover_image_url text,
  period_label text not null default '',
  period_start date,
  period_end date,
  is_visible boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_community_events_visible on public.tb_community_events(is_visible);

drop trigger if exists community_events_updated_at on public.tb_community_events;
create trigger community_events_updated_at
  before update on public.tb_community_events
  for each row execute function public.set_updated_at();

alter table public.tb_community_events enable row level security;

drop policy if exists "community_events_select_visible" on public.tb_community_events;
create policy "community_events_select_visible" on public.tb_community_events
  for select using (is_visible = true);

drop policy if exists "community_events_write_none" on public.tb_community_events;
create policy "community_events_write_none" on public.tb_community_events
  for all using (false) with check (false);

-- ── 커뮤니티 FAQ ──────────────────────────────────────────
create table if not exists public.tb_community_faq (
  id bigint generated always as identity primary key,
  question text not null,
  answer text not null default '',
  is_visible boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_community_faq_visible on public.tb_community_faq(is_visible);

drop trigger if exists community_faq_updated_at on public.tb_community_faq;
create trigger community_faq_updated_at
  before update on public.tb_community_faq
  for each row execute function public.set_updated_at();

alter table public.tb_community_faq enable row level security;

drop policy if exists "community_faq_select_visible" on public.tb_community_faq;
create policy "community_faq_select_visible" on public.tb_community_faq
  for select using (is_visible = true);

drop policy if exists "community_faq_write_none" on public.tb_community_faq;
create policy "community_faq_write_none" on public.tb_community_faq
  for all using (false) with check (false);

-- ── 초기 시드 (테이블이 비어 있을 때만) ───────────────────
insert into public.tb_community_notices (title, content, pinned, published_at, sort_order)
select * from (values
  (
    '다대유 서비스 정식 오픈 안내',
    '안녕하세요, 다대유입니다.' || E'\n\n' || '무장애 여행 정보 플랫폼 다대유가 정식 오픈했습니다. 지도·코스·커뮤니티 기능을 이용해 보세요.' || E'\n\n' || '앞으로도 더 나은 서비스를 위해 노력하겠습니다. 감사합니다.',
    true,
    '2026-05-31T00:00:00+09'::timestamptz,
    0
  ),
  (
    '무장애 정보 제보 포인트 지급 정책 변경 안내',
    '정보 제보 포인트 지급 기준이 아래와 같이 변경됩니다.' || E'\n\n' || '· 반영 완료 시 50P 지급' || E'\n' || '· 중복 제보는 1회만 인정' || E'\n' || '· 허위 제보는 제재 대상',
    true,
    '2026-05-25T00:00:00+09'::timestamptz,
    1
  ),
  (
    '시스템 점검 안내 (5/28 02:00~04:00)',
    '서비스 안정화를 위한 시스템 점검이 예정되어 있습니다.' || E'\n\n' || '일시: 2026년 5월 28일(수) 02:00 ~ 04:00' || E'\n' || '점검 중 일부 기능 이용이 제한될 수 있습니다.',
    false,
    '2026-05-20T00:00:00+09'::timestamptz,
    2
  ),
  (
    '커뮤니티 이용 수칙 안내',
    '모두가 편안하게 이용할 수 있도록 아래 수칙을 지켜 주세요.' || E'\n\n' || '· 비방·욕설 금지' || E'\n' || '· 개인정보 노출 금지' || E'\n' || '· 허위 정보 게시 금지',
    false,
    '2026-05-10T00:00:00+09'::timestamptz,
    3
  )
) as v(title, content, pinned, published_at, sort_order)
where (select count(*) from public.tb_community_notices) = 0;

insert into public.tb_community_events (title, summary, content, emoji, badge_label, badge_color, cover_gradient, period_label, sort_order)
select * from (values
  (
    '무장애 여행 사진 공모전',
    '대전 무장애 여행 사진을 제출하고 상금을 받아가세요!',
    '대전에서 촬영한 무장애 여행 사진을 공모해 주세요.' || E'\n\n' || '· 응모 기간: 2026.05.01 – 06.30' || E'\n' || '· 대상: 누구나' || E'\n' || '· 상금: 대상 50만 원 / 우수상 20만 원',
    '📸',
    '진행중',
    'bg-brand-100 text-brand-700',
    'from-brand-400 to-brand-500',
    '2026.05.01 – 06.30',
    0
  ),
  (
    '접근성 관광지 탐방 투어',
    '가이드와 함께하는 무장애 관광지 탐방 1박 2일 투어',
    '전문 가이드와 함께 대전의 접근성 관광지를 둘러보는 투어입니다.' || E'\n\n' || '· 일정: 2026.06.07 – 06.08' || E'\n' || '· 모집: 선착순 20명' || E'\n' || '· 신청: 커뮤니티 게시판 문의',
    '🚌',
    '선착순',
    'bg-orange-100 text-orange-700',
    'from-orange-400 to-gold-500',
    '2026.06.07 – 06.08',
    1
  )
) as v(title, summary, content, emoji, badge_label, badge_color, cover_gradient, period_label, sort_order)
where (select count(*) from public.tb_community_events) = 0;

insert into public.tb_community_faq (question, answer, sort_order)
select * from (values
  (
    '무장애 여행 정보는 어떻게 제보하나요?',
    '장소 상세 페이지 하단의 「정보 제보」 버튼을 눌러 잘못된 정보나 추가 정보를 작성하시면 됩니다. 검토 후 반영되면 50P가 지급됩니다.',
    0
  ),
  (
    '휠체어 대여가 가능한 장소는 어떻게 찾나요?',
    '지도 메뉴의 필터에서 접근성 항목을 선택하거나, 장소 상세의 접근성 정보에서 「휠체어 대여」 표시를 확인하실 수 있습니다.',
    1
  ),
  (
    '코스를 다른 사람과 공유할 수 있나요?',
    '코스 상세 화면의 공유 버튼을 통해 링크를 공유할 수 있으며, 공개로 설정한 코스는 「공유 코스」 탭에 노출됩니다.',
    2
  )
) as v(question, answer, sort_order)
where (select count(*) from public.tb_community_faq) = 0;
