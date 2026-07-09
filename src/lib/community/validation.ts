export function validateTitleContent(title: string, content: string): string | null {
  if (!title.trim()) return "제목을 입력해 주세요.";
  if (!content.trim()) return "내용을 입력해 주세요.";
  return null;
}

export function validateFaqFields(question: string, answer: string): string | null {
  if (!question.trim()) return "질문을 입력해 주세요.";
  if (!answer.trim()) return "답변을 입력해 주세요.";
  return null;
}

export function validateEventFields(fields: {
  title: string;
  summary: string;
  content: string;
}): string | null {
  if (!fields.title.trim()) return "이벤트명을 입력해 주세요.";
  if (!fields.summary.trim()) return "요약을 입력해 주세요.";
  if (!fields.content.trim()) return "상세 내용을 입력해 주세요.";
  return null;
}
