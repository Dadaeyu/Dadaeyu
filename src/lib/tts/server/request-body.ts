export const TTS_MAX_BODY_BYTES = 16 * 1024;

export function getTextToSpeechRequestBodySizeBytes(headers: Headers) {
  const rawLength = headers.get("content-length");
  if (!rawLength) return null;

  const parsed = Number(rawLength);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function isTextToSpeechBodySizeAllowed(sizeBytes: number | null) {
  return sizeBytes === null || sizeBytes <= TTS_MAX_BODY_BYTES;
}
