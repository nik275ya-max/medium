export interface Settings {
  systemPrompt: string;
  selectedVoice: string;
  polzaApiKey: string;
  temperature: number;
}

export type AppState = 'idle' | 'listening' | 'processing' | 'speaking';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
