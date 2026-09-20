function formatCourseDate(value: string | null | undefined): string | null {
  const ymd = value?.trim().slice(0, 10);
  return ymd && /^\d{4}-\d{2}-\d{2}$/u.test(ymd) ? ymd : null;
}

export function formatCoursePeriod(start: string | null, end: string | null): string | null {
  const from = formatCourseDate(start);
  const to = formatCourseDate(end);
  if (!from && !to) return null;
  if (from && to) return from === to ? from : `${from} ~ ${to}`;
  return from ?? to;
}
