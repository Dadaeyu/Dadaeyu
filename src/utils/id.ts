// 임시
// 클라이언트에서 임시 항목(코스/장소/댓글/이벤트 등)에 부여하는 로컬 ID 생성기.
// 단조 증가 카운터라 렌더 중 impure 호출(Date.now/Math.random)이 없어
// react-hooks/purity 린트와 React 렌더 규칙에 안전하다.
// 시드값이 충분히 커서 시드 데이터(소수 ID)와 충돌하지 않는다.
let counter = 1_000_000_000;

/** 새 임시 숫자 ID를 반환한다. */
export function genId(): number {
  counter += 1;
  return counter;
}
