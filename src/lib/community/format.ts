export function formatCommunityDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}`;
}

export function renderMultilineText(content: string) {
  return content.split(/\r?\n/).filter((line, i, arr) => line.length > 0 || i < arr.length - 1);
}
