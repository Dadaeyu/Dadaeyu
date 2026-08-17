export type TextToSpeechAccountingCleanupOperation = "finalize" | "refund";

export type TextToSpeechAccountingCleanupFailure = {
  attempts: number;
  error: unknown;
  operation: TextToSpeechAccountingCleanupOperation;
  reservationToken: string;
};

export type TextToSpeechAccountingCleanupRetryOptions = {
  backoffMs?: number;
  cleanup: () => Promise<void>;
  maxAttempts?: number;
  onFinalFailure: (failure: TextToSpeechAccountingCleanupFailure) => void;
  operation: TextToSpeechAccountingCleanupOperation;
  reservationToken: string;
  sleep?: (milliseconds: number) => Promise<void>;
};

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BACKOFF_MS = 25;

export async function retryTextToSpeechAccountingCleanup({
  backoffMs = DEFAULT_BACKOFF_MS,
  cleanup,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  onFinalFailure,
  operation,
  reservationToken,
  sleep = sleepFor
}: TextToSpeechAccountingCleanupRetryOptions) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await cleanup();
      return;
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await sleep(backoffMs * attempt);
      }
    }
  }

  onFinalFailure({
    attempts: maxAttempts,
    error: lastError,
    operation,
    reservationToken
  });
}

function sleepFor(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
