const GOOGLE_BILLING_TIME_ZONE = "America/Los_Angeles";

export function getGoogleTextToSpeechBillingPeriods(date = new Date()) {
  return {
    billingPeriod: formatPeriod(date, { month: "2-digit", year: "numeric" }),
    clientPeriod: formatPeriod(date, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    })
  };
}

function formatPeriod(date: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-CA", {
    ...options,
    timeZone: GOOGLE_BILLING_TIME_ZONE
  }).format(date);
}
