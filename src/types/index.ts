export interface Settings {
  systemPrompt: string;
  selectedVoice: string;
  polzaApiKey: string;
  temperature: number;
  licenseKey: string;
  soundMode: 'paranormal' | 'radio'; // Новый параметр
}

export interface LicenseValidationResult {
  valid: boolean;
  error: string | null;
  expiresDate: string | null;
  expiresFormatted: string | null;
  expired?: boolean;
}

export type AppState = 'idle' | 'listening' | 'processing' | 'speaking';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
