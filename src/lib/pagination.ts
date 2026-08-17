export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

export type ListParams = {
  page: number;
  pageSize: number;
  q: string;
  from: number;
  to: number;
};

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

/** 커뮤니티 공개 목록: 10 / 20 / 30, 기본 10 */
export const COMMUNITY_PAGE_SIZES = [10, 20, 30] as const;
export const COMMUNITY_DEFAULT_PAGE_SIZE = 10;

export function parseCommunityListParams(searchParams: URLSearchParams): ListParams {
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const rawSize = Number(searchParams.get("pageSize")) || COMMUNITY_DEFAULT_PAGE_SIZE;
  const pageSize = (COMMUNITY_PAGE_SIZES as readonly number[]).includes(rawSize)
    ? rawSize
    : COMMUNITY_DEFAULT_PAGE_SIZE;
  const q = (searchParams.get("q") ?? "").trim();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return { page, pageSize, q, from, to };
}

export function parseListParams(
  searchParams: URLSearchParams,
  defaultPageSize = DEFAULT_PAGE_SIZE
): ListParams {
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const rawSize = Number(searchParams.get("pageSize")) || defaultPageSize;
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, rawSize));
  const q = (searchParams.get("q") ?? "").trim();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return { page, pageSize, q, from, to };
}

export function totalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function escapeIlikePattern(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}
