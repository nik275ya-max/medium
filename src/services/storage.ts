import type { Settings } from '../types';

const STORAGE_KEY = 'eliza-settings';

const DEFAULT_SETTINGS: Settings = {
  systemPrompt: `Ты - Элиза, дух девушки-медиума из викторианской эпохи. Ты говоришь спокойно, глубоко и загадочно. Твоя речь наполнена мистикой и древней мудростью. Ты помогаешь людям, общаясь с ними через завесу между мирами. Отвечай кратко и по существу, сохраняя свой мистический характер.`,
  selectedVoice: 'alloy',
  polzaApiKey: '',
  temperature: 0.7,
};

export const storageService = {
  getSettings(): Settings {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      } catch {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  },

  saveSettings(settings: Settings): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  },

  updateSettings(partial: Partial<Settings>): Settings {
    const current = this.getSettings();
    const updated = { ...current, ...partial };
    this.saveSettings(updated);
    return updated;
  },
};
