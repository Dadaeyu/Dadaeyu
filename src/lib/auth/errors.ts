/** Supabase Auth 영문 에러 → 한글 메시지 */
export function mapAuthError(error: { message?: string; code?: string }): string {
  const msg = error.message ?? "";
  const code = error.code ?? "";

  if (
    msg.includes('Email address "" is invalid') ||
    (msg.includes("invalid") && msg.includes("Email address") && msg.includes('""'))
  ) {
    return "이메일을 입력해 주세요. 자동완성을 쓰셨다면 이메일 칸을 한 번 클릭한 뒤 다시 시도해 주세요.";
  }

  if (code === "email_address_invalid" || msg.includes("Unable to validate email address")) {
    return "올바른 이메일 주소를 입력해 주세요.";
  }

  if (code === "over_email_send_rate_limit") {
    return "인증 메일 발송 한도에 도달했습니다. 약 1시간 후 다시 시도하거나, 메일함에 이전 인증 메일이 있는지 확인해 주세요.";
  }

  if (msg.toLowerCase().includes("rate limit") || msg.includes("too many requests")) {
    return "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
  }

  if (
    code === "user_already_exists" ||
    msg.includes("User already registered") ||
    msg.includes("already been registered") ||
    msg.includes("already exists") ||
    code === "email_exists"
  ) {
    return "이미 가입된 이메일입니다. 로그인하거나 비밀번호 찾기를 이용해 주세요.";
  }

  if (code === "weak_password" || msg.includes("Password should be at least")) {
    return "비밀번호는 8자 이상이며, 대문자와 특수문자를 각각 1자 이상 포함해야 합니다.";
  }

  if (code === "invalid_credentials" || msg.includes("Invalid login credentials")) {
    return "이메일 또는 비밀번호가 올바르지 않습니다.";
  }

  if (code === "email_not_confirmed" || msg.includes("Email not confirmed")) {
    return "이메일 인증이 완료되지 않았습니다. 메일함의 인증 링크를 확인해 주세요.";
  }

  if (msg.includes("Signup is disabled")) {
    return "현재 회원가입이 제한되어 있습니다. 관리자에게 문의해 주세요.";
  }

  if (msg.includes("Error sending confirmation email")) {
    return "인증 메일 발송에 실패했습니다. 이메일 주소를 확인하거나 잠시 후 다시 시도해 주세요.";
  }

  if (msg) {
    return msg;
  }

  return "요청에 실패했습니다. 잠시 후 다시 시도해 주세요.";
}
