const CHAT_BILLING_TIME_ZONE = "Asia/Seoul";

export function getChatUsagePeriods(date = new Date()) {
  return {
    clientPeriod: formatPeriod(date, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }),
    globalPeriod: formatPeriod(date, {
      month: "2-digit",
      year: "numeric"
    })
  };
}

function formatPeriod(date: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-CA", {
    ...options,
    timeZone: CHAT_BILLING_TIME_ZONE
  }).format(date);
}
