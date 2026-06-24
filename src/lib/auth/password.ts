export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_RULES_HINT =
  "8자 이상, 대문자 1자 이상, 특수문자 1자 이상";

export function getPasswordValidationError(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`;
  }
  if (!/[A-Z]/.test(password)) {
    return "비밀번호에 대문자를 한 글자 이상 포함해 주세요.";
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "비밀번호에 특수문자를 한 글자 이상 포함해 주세요.";
  }
  return null;
}

export function isPasswordValid(password: string): boolean {
  return getPasswordValidationError(password) === null;
}
