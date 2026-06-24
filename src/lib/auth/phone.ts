/** 휴대폰 번호를 숫자만 추출 (예: 01012345678) */
export function normalizePhone(input: string): string {
  return input.replace(/\D/g, "");
}

/** 한국 휴대폰 010/011 등 10~11자리 */
export function isValidPhone(input: string): boolean {
  const digits = normalizePhone(input);
  return /^01[016789]\d{7,8}$/.test(digits);
}

/** 표시용 포맷 (010-1234-5678) */
export function formatPhoneDisplay(input: string): string {
  const digits = normalizePhone(input);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length <= 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}

/** 이메일 마스킹 (hae***@gmail.com) */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  const visible = local.length <= 2 ? local[0] ?? "*" : local.slice(0, 3);
  return `${visible}***@${domain}`;
}
