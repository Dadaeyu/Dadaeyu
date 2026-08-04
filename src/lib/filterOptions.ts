"use client";

import { useEffect, useState } from "react";

// 지도 필터의 접근성/테마 옵션 (tb_code 에서 조회, /api/codes/filter-options).
// 값(filters.accessibility / filters.themes)에는 code(코드 아이디)를 담고, 화면엔 name 을 표시한다.
export type FilterCodeOption = { code: string; name: string };
export type FilterOptions = { accessibility: FilterCodeOption[]; themes: FilterCodeOption[] };

const EMPTY: FilterOptions = { accessibility: [], themes: [] };

// 옵션은 앱 구동 중 바뀌지 않으므로 모듈 스코프에 1회만 캐시한다.
// (필터를 열 때마다 재조회하지 않도록 — 브라우저 첫 진입 시 prefetch 로 미리 받아둔다.)
let cache: FilterOptions | null = null;
let inflight: Promise<FilterOptions> | null = null;

function load(): Promise<FilterOptions> {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = fetch("/api/codes/filter-options")
      .then((r) => r.json())
      .then((d) => {
        cache = {
          accessibility: Array.isArray(d?.accessibility) ? d.accessibility : [],
          themes: Array.isArray(d?.themes) ? d.themes : []
        };
        return cache;
      })
      .catch(() => {
        inflight = null; // 실패 시 다음 호출에서 재시도 가능하게
        return EMPTY;
      });
  }
  return inflight;
}

// 브라우저 첫 진입 시 미리 받아두기 (RootShell 마운트에서 호출).
export function prefetchFilterOptions(): void {
  void load();
}

// 캐시된 옵션 반환. 아직 없으면 로드해 갱신한다. (여러 곳에서 써도 조회는 1회)
export function useFilterOptions(): FilterOptions {
  const [opts, setOpts] = useState<FilterOptions>(cache ?? EMPTY);
  useEffect(() => {
    if (cache) {
      setOpts(cache);
      return;
    }
    let alive = true;
    load().then((o) => {
      if (alive) setOpts(o);
    });
    return () => {
      alive = false;
    };
  }, []);
  return opts;
}
