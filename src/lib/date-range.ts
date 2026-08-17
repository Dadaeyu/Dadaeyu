/** 날짜/기간 앞뒤 관계 보정 (이벤트·팝업·필터 공통) */

function isDateOnly(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

function compareTemporal(a: string, b: string): number | null {
  const left = a.trim();
  const right = b.trim();
  if (!left || !right) return null;

  if (isDateOnly(left) && isDateOnly(right)) {
    if (left < right) return -1;
    if (left > right) return 1;
    return 0;
  }

  const leftMs = new Date(left).getTime();
  const rightMs = new Date(right).getTime();
  if (Number.isNaN(leftMs) || Number.isNaN(rightMs)) return null;
  if (leftMs < rightMs) return -1;
  if (leftMs > rightMs) return 1;
  return 0;
}

/**
 * 시작이 바뀌었을 때 종료가 앞이면 종료를 비운다.
 * @param allowEqual 같은 시각/날짜 허용 (이벤트 일자: true, 팝업 datetime: false)
 */
export function resolveEndAfterStartChange(start: string, end: string, allowEqual = true): string {
  if (!start || !end) return end;
  const cmp = compareTemporal(start, end);
  if (cmp == null) return end;
  if (allowEqual ? cmp > 0 : cmp >= 0) return "";
  return end;
}

/** 종료가 시작보다 이전이면 true (저장 검증용) */
export function isEndBeforeStart(start: string, end: string, allowEqual = true): boolean {
  if (!start || !end) return false;
  const cmp = compareTemporal(start, end);
  if (cmp == null) return false;
  return allowEqual ? cmp > 0 : cmp >= 0;
}

export function openNativeDatePicker(el: HTMLInputElement) {
  try {
    el.showPicker?.();
  } catch {
    /* ignore */
  }
}
