import DOMPurify from "isomorphic-dompurify";

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

export function looksLikeHtml(content: string): boolean {
  return /<[a-z][\s\S]*>/i.test(content);
}

export function sanitizeCommunityHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ["target", "rel", "class", "width", "height", "style", "data-width"]
  });
}

export function isEmptyRichText(html: string): boolean {
  // 이미지만 있는 본문도 유효한 리치 콘텐츠로 본다
  if (/<(img|video|iframe)\b/i.test(html)) return false;
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length === 0;
}
