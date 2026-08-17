import { DEFAULT_PAGE_SIZE, escapeIlikePattern, parseListParams } from "@/lib/pagination";

export { parseListParams, DEFAULT_PAGE_SIZE };

export function applyIlikeSearch<T extends { ilike: (col: string, pattern: string) => T }>(
  query: T,
  column: string,
  q: string
): T {
  if (!q.trim()) return query;
  return query.ilike(column, `%${escapeIlikePattern(q)}%`);
}

export function applyOrIlikeSearch<T extends { or: (filters: string) => T }>(
  query: T,
  columns: string[],
  q: string
): T {
  if (!q.trim()) return query;
  const pattern = `%${escapeIlikePattern(q)}%`;
  const filters = columns.map((col) => `${col}.ilike.${pattern}`).join(",");
  return query.or(filters);
}
