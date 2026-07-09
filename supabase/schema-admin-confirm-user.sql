-- 관리자 공용 계정 이메일 인증 수동 완료
-- 1) 먼저 schema-fix-tb-functions.sql 실행 (tb_ 리네임 후 필수)
-- 2) 아래 UPDATE 실행

UPDATE auth.users
SET email_confirmed_at = timezone('utc', now())
WHERE id = '4e34ec37-0f40-4d9c-8818-9d5f726c20f7';

-- 또는 이메일로 찾기:
-- WHERE lower(email) = 'alianfamily@dadaeyu.com';
