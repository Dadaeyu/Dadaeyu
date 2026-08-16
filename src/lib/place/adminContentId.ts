// 관리자가 수동으로 등록한 tb_place 행은 contentid 를 정부 API 값(항상 순수 숫자 문자열)과
// 절대 겹치지 않는 "a" 접두 문자열로 채워 구분한다(null 대신 사용 — null 로 두면 상세 조회/접근성
// 필터 등 contentid 기준 조회 경로 전체에서 클릭 불가능한 장소가 되어버린다).
const ADMIN_CONTENT_ID_PREFIX = "a";

export function isAdminContentId(contentid: string | null | undefined): boolean {
  return typeof contentid === "string" && contentid.startsWith(ADMIN_CONTENT_ID_PREFIX);
}

const RANDOM_DIGITS = 6;

// 정부 API contentid(순수 숫자, 보통 6~7자리)와 자릿수 느낌을 맞춰 "a"+7자리 숫자로 만든다.
// 완전한 유일성은 보장 안 되므로(1000만 분의 1 확률로 충돌), 호출측에서 unique 제약 위반 시
// 재시도해야 한다.
export function generateAdminContentId(): string {
  const n = Math.floor(Math.random() * 10 ** RANDOM_DIGITS);
  return `${ADMIN_CONTENT_ID_PREFIX}${String(n).padStart(RANDOM_DIGITS, "0")}`;
}
