export function createTimeoutSignal(timeoutMs: number, signal?: AbortSignal) {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  if (!signal) return timeoutSignal;
  if (signal.aborted) return signal;

  return AbortSignal.any([signal, timeoutSignal]);
}
