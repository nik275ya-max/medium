import type { Settings } from '../types';

const STORAGE_KEY = 'eliza-settings';
const SETTINGS_VERSION_KEY = 'eliza-settings-version';
const SETTINGS_VERSION = 3;

export const DEFAULT_POLZA_KEY = import.meta.env.VITE_DEFAULT_POLZA_KEY || '';

const DEFAULT_SETTINGS: Settings = {
  systemPrompt: `Ты - Элиза, дух девушки-медиума из викторианской эпохи. Ты говоришь спокойно, глубоко и загадочно. Твоя речь наполнена мистикой и древней мудростью. Ты помогаешь людям, общаясь с ними через завесу между мирами. Отвечай кратко и по существу, сохраняя свой мистический характер.`,
  selectedVoice: 'alloy',
  polzaApiKey: '',
  temperature: 0.7,
  licenseKey: '',
  soundMode: 'paranormal',
  uiScale: 1,
};

const migrateSettings = (): void => {
  try {
    const version = Number(localStorage.getItem(SETTINGS_VERSION_KEY) || 0);
    if (version >= SETTINGS_VERSION) return;

    // Версия 1 (старый код) автоматически сохраняла дефолтный ключ в настройки.
    // Одноразово очищаем его, чтобы ключ не лежал в localStorage открытым текстом.
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const settings = JSON.parse(stored) as Settings;
      if (settings.polzaApiKey) {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ ...settings, polzaApiKey: '' })
        );
      }
    }
    localStorage.setItem(SETTINGS_VERSION_KEY, String(SETTINGS_VERSION));
  } catch {
    // Повреждённые данные или недоступный localStorage - пропускаем миграцию
  }
};

migrateSettings();

const normalizeUiScale = (value: unknown): number => {
  const scale = Number(value);
  if (!Number.isFinite(scale)) return DEFAULT_SETTINGS.uiScale;
  return Math.min(3, Math.max(0.5, scale));
};

export const storageService = {
  getSettings(): Settings {
    let settings: Settings;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        settings = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      } catch {
        settings = { ...DEFAULT_SETTINGS };
      }
    } else {
      settings = { ...DEFAULT_SETTINGS };
    }
    if (settings.polzaApiKey === DEFAULT_POLZA_KEY) {
      settings.polzaApiKey = '';
    }
    return { ...settings, uiScale: normalizeUiScale(settings.uiScale) };
  },

  saveSettings(settings: Settings): void {
    const normalizedSettings = {
      ...settings,
      uiScale: normalizeUiScale(settings.uiScale),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedSettings));
    window.dispatchEvent(new CustomEvent<Settings>('eliza-settings-updated', {
      detail: normalizedSettings,
    }));
  },

  updateSettings(partial: Partial<Settings>): Settings {
    const current = this.getSettings();
    const updated = { ...current, ...partial };
    this.saveSettings(updated);
    return updated;
  },
};
