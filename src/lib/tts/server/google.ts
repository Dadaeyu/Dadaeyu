import "server-only";

import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import type { TextToSpeechVoice } from "@/lib/tts/types";
import { TextToSpeechProviderError, type TextToSpeechProvider } from "@/lib/tts/server/provider";
import { reserveGoogleTextToSpeechUsage } from "@/lib/tts/server/google-usage";

const DEFAULT_VOICE = "ko-KR-Chirp3-HD-Sulafat";
const DEFAULT_SPEED = 1;
const MAX_INPUT_BYTES = 5_000;

const GOOGLE_ALLOWED_VOICE_IDS = [
  "ko-KR-Standard-A",
  "ko-KR-Standard-B",
  "ko-KR-Standard-C",
  "ko-KR-Standard-D",
  "ko-KR-Neural2-A",
  "ko-KR-Neural2-B",
  "ko-KR-Neural2-C",
  "ko-KR-Chirp3-HD-Aoede",
  "ko-KR-Chirp3-HD-Sulafat"
] as const;

export class GoogleTextToSpeechProvider implements TextToSpeechProvider {
  readonly id = "google";

  private readonly enabled = process.env.GOOGLE_TTS_ENABLED !== "false";
  private readonly defaultVoice = resolveVoice(process.env.GOOGLE_TTS_VOICE);
  private readonly speed = resolveSpeed(process.env.GOOGLE_TTS_SPEED);
  private client: TextToSpeechClient | null = null;

  getCapabilities() {
    const activeVoice: TextToSpeechVoice = {
      id: this.defaultVoice,
      name: "다유"
    };

    return {
      available: this.enabled,
      defaultVoice: this.defaultVoice,
      provider: this.id,
      voices: [activeVoice]
    };
  }

  async synthesize(
    { text, voice: requestedVoice }: { text: string; voice?: string },
    options?: { clientKey?: string; signal?: AbortSignal }
  ) {
    if (!this.enabled) {
      throw new TextToSpeechProviderError("Google TTS is disabled.", 503);
    }

    if (Buffer.byteLength(text, "utf8") > MAX_INPUT_BYTES) {
      throw new TextToSpeechProviderError("Google TTS input exceeds the request limit.", 400);
    }

    if (options?.signal?.aborted) {
      throw new DOMException("The operation was aborted.", "AbortError");
    }

    if (!options?.clientKey) {
      throw new TextToSpeechProviderError("TTS client identity is missing.", 503);
    }

    const client = this.getClient();
    await reserveGoogleTextToSpeechUsage(text, options.clientKey);
    const voice = resolveVoice(requestedVoice ?? this.defaultVoice);

    try {
      const [response] = await withAbort(
        client.synthesizeSpeech({
          audioConfig: {
            audioEncoding: "MP3",
            speakingRate: this.speed
          },
          input: { text },
          voice: {
            languageCode: "ko-KR",
            name: voice
          }
        }),
        options?.signal
      );
      const audioContent = response.audioContent;

      if (!audioContent) {
        throw new TextToSpeechProviderError("Google did not return playable speech audio.", 502);
      }

      const audioBytes =
        typeof audioContent === "string"
          ? Uint8Array.from(Buffer.from(audioContent, "base64"))
          : Uint8Array.from(audioContent);

      return {
        contentType: "audio/mpeg",
        stream: bytesToStream(audioBytes)
      };
    } catch (error) {
      if (error instanceof TextToSpeechProviderError) {
        throw error;
      }
      if (options?.signal?.aborted || isAbortError(error)) {
        throw new DOMException("The operation was aborted.", "AbortError");
      }

      throw new TextToSpeechProviderError(
        "Google speech request failed.",
        getGoogleErrorStatus(error)
      );
    }
  }

  private getClient() {
    if (!this.client) {
      this.client = new TextToSpeechClient(resolveClientOptions());
    }
    return this.client;
  }
}

function resolveClientOptions() {
  const rawCredentials = process.env.GOOGLE_TTS_CREDENTIALS_JSON?.trim();
  if (!rawCredentials) return {};

  try {
    const credentials = JSON.parse(rawCredentials) as {
      client_email?: string;
      private_key?: string;
      project_id?: string;
    };

    if (!credentials.client_email || !credentials.private_key) {
      throw new Error("Incomplete Google TTS credentials");
    }

    return {
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key.replace(/\\n/g, "\n")
      },
      projectId: credentials.project_id
    };
  } catch {
    throw new TextToSpeechProviderError("Google TTS credentials are invalid.", 503);
  }
}

function resolveVoice(voice?: string) {
  return GOOGLE_ALLOWED_VOICE_IDS.includes(voice as (typeof GOOGLE_ALLOWED_VOICE_IDS)[number])
    ? voice!
    : DEFAULT_VOICE;
}

function resolveSpeed(value?: string) {
  const speed = Number(value);
  return Number.isFinite(speed) && speed >= 0.25 && speed <= 4 ? speed : DEFAULT_SPEED;
}

function bytesToStream(bytes: Uint8Array) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    }
  });
}

function withAbort<T>(promise: Promise<T>, signal?: AbortSignal) {
  if (!signal) return promise;

  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(new DOMException("The operation was aborted.", "AbortError"));
    signal.addEventListener("abort", abort, { once: true });
    promise.then(resolve, reject).finally(() => {
      signal.removeEventListener("abort", abort);
    });
  });
}

function getGoogleErrorStatus(error: unknown) {
  const code =
    typeof error === "object" && error && "code" in error ? Number(error.code) : Number.NaN;

  if (code === 3) return 400;
  if (code === 8) return 429;
  if (code === 4 || code === 7 || code === 16) return 503;
  return 502;
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}
