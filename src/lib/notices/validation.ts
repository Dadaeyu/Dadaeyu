export type NoticeFields = {
  title: string;
  content: string;
  priority: number;
  starts_at: string | null;
  ends_at: string | null;
};

export function validateNoticeFields(fields: NoticeFields): string | null {
  const title = fields.title.trim();
  const content = fields.content.trim();

  if (!title) return "제목을 입력해 주세요.";
  if (!content) return "내용을 입력해 주세요.";

  if (!Number.isFinite(fields.priority) || fields.priority < 0) {
    return "우선순위는 0 이상의 숫자여야 합니다.";
  }

  if (fields.starts_at && Number.isNaN(new Date(fields.starts_at).getTime())) {
    return "시작일 형식이 올바르지 않습니다.";
  }

  if (fields.ends_at && Number.isNaN(new Date(fields.ends_at).getTime())) {
    return "종료일 형식이 올바르지 않습니다.";
  }

  if (fields.starts_at && fields.ends_at) {
    const startMs = new Date(fields.starts_at).getTime();
    const endMs = new Date(fields.ends_at).getTime();
    if (endMs <= startMs) {
      return "종료일은 시작일보다 이후여야 합니다.";
    }
  }

  return null;
}
