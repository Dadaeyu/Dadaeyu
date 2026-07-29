export type TextToSpeechVoice = {
  id: string;
  name: string;
};

export type TextToSpeechCapabilities = {
  available: boolean;
  defaultVoice: string;
  provider: string;
  voices: TextToSpeechVoice[];
};

export type TextToSpeechInput = {
  text: string;
  voice?: string;
};
