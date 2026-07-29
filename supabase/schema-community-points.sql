-- 커뮤니티 점수 정책: 제보 승인 50P (일일 캡 제외, 앱 awardPoints와 동일)
-- 기존 30P 트리거를 교체. Supabase SQL Editor에서 실행.

create or replace function public.award_report_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved'
     and (old.status is distinct from 'approved')
     and new.points_awarded = 0 then
    new.points_awarded := 50;
    insert into public.tb_user_point_events (user_id, amount, reason, ref_type, ref_id)
    values (new.user_id, 50, 'report_approved', 'report', new.id);
  end if;
  return new;
end;
$$;
