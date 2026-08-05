import "server-only";

import { GoogleTextToSpeechProvider } from "@/lib/tts/server/google";
import { TextToSpeechProviderError, type TextToSpeechProvider } from "@/lib/tts/server/provider";

const providerFactories = {
  google: () => new GoogleTextToSpeechProvider()
} satisfies Record<string, () => TextToSpeechProvider>;
const providerCache = new Map<string, TextToSpeechProvider>();

export function createTextToSpeechProvider(): TextToSpeechProvider {
  const providerName = process.env.TTS_PROVIDER?.trim().toLowerCase() || "google";
  const createProvider = providerFactories[providerName as keyof typeof providerFactories];

  if (!createProvider) {
    throw new TextToSpeechProviderError(`Unsupported TTS provider: ${providerName}`, 503);
  }

  const cachedProvider = providerCache.get(providerName);
  if (cachedProvider) return cachedProvider;

  const provider = createProvider();
  providerCache.set(providerName, provider);
  return provider;
}

export { TextToSpeechProviderError } from "@/lib/tts/server/provider";
