import "server-only";

import type { TextToSpeechCapabilities, TextToSpeechInput } from "@/lib/tts/types";

export type TextToSpeechAudio = {
  contentType: string;
  stream: ReadableStream<Uint8Array>;
};

export interface TextToSpeechProvider {
  readonly id: string;
  getCapabilities(): TextToSpeechCapabilities;
  synthesize(
    input: TextToSpeechInput,
    options?: { signal?: AbortSignal }
  ): Promise<TextToSpeechAudio>;
}

export class TextToSpeechProviderError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "TextToSpeechProviderError";
  }
}
