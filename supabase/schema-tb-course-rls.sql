-- tb_course / tb_course_detail RLS
-- 증상: 로그인해도 마이페이지·코스탭 「내 코스」가 비어 있음
-- (service role로는 보이지만 anon/authenticated SELECT가 정책 없어 빈 배열)

alter table public.tb_course enable row level security;
alter table public.tb_course_detail enable row level security;

-- register 는 text UUID 저장 → auth.uid()::text 비교
drop policy if exists "tb_course_select" on public.tb_course;
create policy "tb_course_select" on public.tb_course
  for select using (
    register = auth.uid()::text
    or upper(coalesce(open_yn, 'Y')) = 'Y'
    or public.is_admin()
  );

drop policy if exists "tb_course_insert_own" on public.tb_course;
create policy "tb_course_insert_own" on public.tb_course
  for insert with check (
    register = auth.uid()::text
    or public.is_admin()
  );

drop policy if exists "tb_course_update_own" on public.tb_course;
create policy "tb_course_update_own" on public.tb_course
  for update using (
    register = auth.uid()::text
    or public.is_admin()
  )
  with check (
    register = auth.uid()::text
    or public.is_admin()
  );

drop policy if exists "tb_course_delete_own" on public.tb_course;
create policy "tb_course_delete_own" on public.tb_course
  for delete using (
    register = auth.uid()::text
    or public.is_admin()
  );

-- detail: 공개 코스 또는 내 코스면 조회, 내 코스면 수정
drop policy if exists "tb_course_detail_select" on public.tb_course_detail;
create policy "tb_course_detail_select" on public.tb_course_detail
  for select using (
    exists (
      select 1 from public.tb_course c
      where c.course_id = tb_course_detail.course_id
        and (
          c.register = auth.uid()::text
          or upper(coalesce(c.open_yn, 'Y')) = 'Y'
          or public.is_admin()
        )
    )
  );

drop policy if exists "tb_course_detail_mutate" on public.tb_course_detail;
create policy "tb_course_detail_mutate" on public.tb_course_detail
  for all using (
    exists (
      select 1 from public.tb_course c
      where c.course_id = tb_course_detail.course_id
        and (c.register = auth.uid()::text or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.tb_course c
      where c.course_id = tb_course_detail.course_id
        and (c.register = auth.uid()::text or public.is_admin())
    )
  );
