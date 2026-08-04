export type BoundedRequestBodyResult =
  | { ok: true; text: string; sizeBytes: number }
  | { ok: false; reason: "too_large"; sizeBytes: number };

export async function readBoundedRequestBody(
  request: Request,
  limitBytes: number
): Promise<BoundedRequestBodyResult> {
  if (!request.body) return { ok: true, text: "", sizeBytes: 0 };

  const reader = request.body.getReader();
  const accumulator = createBoundedBodyAccumulator(limitBytes);

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        return {
          ok: true,
          text: accumulator.getText(),
          sizeBytes: accumulator.sizeBytes
        };
      }

      if (value && !accumulator.append(value)) {
        try {
          await reader.cancel();
        } catch {
          // The overflow result is the important outcome; cancellation is best-effort cleanup.
        }
        return {
          ok: false,
          reason: "too_large",
          sizeBytes: accumulator.sizeBytes
        };
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export function createBoundedBodyAccumulator(limitBytes: number) {
  const chunks: Uint8Array[] = [];
  let sizeBytes = 0;
  let storedSizeBytes = 0;

  return {
    append(chunk: Uint8Array) {
      sizeBytes += chunk.byteLength;
      if (sizeBytes > limitBytes) return false;
      chunks.push(chunk);
      storedSizeBytes += chunk.byteLength;
      return true;
    },
    getText() {
      return new TextDecoder().decode(concatChunks(chunks, storedSizeBytes));
    },
    get sizeBytes() {
      return sizeBytes;
    }
  };
}

function concatChunks(chunks: Uint8Array[], sizeBytes: number) {
  const body = new Uint8Array(sizeBytes);
  let offset = 0;

  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return body;
}
