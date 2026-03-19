import type { LicenseValidationResult } from '../types';

const STORAGE_KEY = 'eliza-license-key';

/**
 * Вычисление CRC16 контрольной суммы
 */
function crc16(data: string): number {
  let crc = 0xFFFF;
  const table: number[] = [];

  // Генерация таблицы CRC16 (полином 0xA001)
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xA001 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }

  // Вычисление CRC
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data.charCodeAt(i)) & 0xFF] ^ (crc >>> 8);
  }

  return crc & 0xFFFF;
}

/**
 * Преобразование CRC16 в 4-символьную строку (hex)
 */
function crcToChecksum(crc: number): string {
  return crc.toString(16).padStart(4, '0').toUpperCase();
}

/**
 * Проверка контрольной суммы
 */
function verifyChecksum(datePart: string, checksum: string): boolean {
  const computedCrc = crc16(datePart);
  const computedChecksum = crcToChecksum(computedCrc);
  return computedChecksum === checksum.toUpperCase();
}

/**
 * Проверка формата даты YYYYMMDD
 */
function isValidDate(dateStr: string): boolean {
  if (!/^\d{8}$/.test(dateStr)) return false;

  const year = parseInt(dateStr.substring(0, 4), 10);
  const month = parseInt(dateStr.substring(4, 6), 10);
  const day = parseInt(dateStr.substring(6, 8), 10);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/**
 * Форматирование даты из YYYYMMDD в читаемый вид
 */
export function formatDate(dateStr: string): string {
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  return `${day}.${month}.${year}`;
}

/**
 * Валидация формата ключа
 */
export function validateKeyFormat(key: string, checkExpiration = true): LicenseValidationResult {
  const normalizedKey = key.toUpperCase().trim();

  // Проверка формата
  const formatRegex = /^ELIZA-(\d{8})-([A-Z0-9]{4})-([A-Z0-9]{4})$/;
  const match = normalizedKey.match(formatRegex);

  if (!match) {
    return {
      valid: false,
      error: 'Неверный формат ключа. Ожидался ELIZA-YYYYMMDD-XXXX-XXXX',
      expiresDate: null,
      expiresFormatted: null,
    };
  }

  const datePart = match[1];
  const checksum = match[2];

  // Проверка формата даты
  if (!isValidDate(datePart)) {
    return {
      valid: false,
      error: 'Неверная дата в ключе',
      expiresDate: null,
      expiresFormatted: null,
    };
  }

  // Проверка контрольной суммы
  if (!verifyChecksum(datePart, checksum)) {
    return {
      valid: false,
      error: 'Неверная контрольная сумма ключа',
      expiresDate: null,
      expiresFormatted: null,
    };
  }

  const expiresFormatted = formatDate(datePart);

  // Проверка даты истечения
  if (checkExpiration) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const year = parseInt(datePart.substring(0, 4), 10);
    const month = parseInt(datePart.substring(4, 6), 10);
    const day = parseInt(datePart.substring(6, 8), 10);
    const expiresDate = new Date(year, month - 1, day);

    if (expiresDate < today) {
      return {
        valid: false,
        error: `Срок действия ключа истёк ${expiresFormatted}`,
        expiresDate: datePart,
        expiresFormatted: expiresFormatted,
        expired: true,
      };
    }
  }

  return {
    valid: true,
    error: null,
    expiresDate: datePart,
    expiresFormatted: expiresFormatted,
    expired: false,
  };
}

/**
 * Сохранение ключа в localStorage
 */
function saveLicense(key: string): void {
  try {
    console.log('[License] Saving key:', key);
    localStorage.setItem(STORAGE_KEY, key);
    console.log('[License] Key saved. Current value:', localStorage.getItem(STORAGE_KEY));
  } catch (error) {
    console.error('[License] Failed to save license:', error);
  }
}

/**
 * Загрузка ключа из localStorage
 */
function loadLicense(): string | null {
  try {
    const key = localStorage.getItem(STORAGE_KEY);
    console.log('[License] Loaded key:', key);
    return key;
  } catch (error) {
    console.error('[License] Failed to load license:', error);
    return null;
  }
}

/**
 * Удаление ключа из localStorage
 */
function clearLicense(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear license:', error);
  }
}

/**
 * Активация лицензионного ключа
 */
export function activateLicense(key: string): LicenseValidationResult {
  const normalizedKey = key.toUpperCase().trim();

  const validation = validateKeyFormat(normalizedKey, true);

  if (!validation.valid) {
    return validation;
  }

  saveLicense(normalizedKey);
  return validation;
}

/**
 * Проверка лицензии при запуске
 */
export function checkLicense(): LicenseValidationResult {
  const storedKey = loadLicense();

  if (!storedKey) {
    return {
      valid: false,
      error: 'Лицензионный ключ не найден',
      expiresDate: null,
      expiresFormatted: null,
    };
  }

  const validation = validateKeyFormat(storedKey, true);

  if (!validation.valid) {
    clearLicense();
    return validation;
  }

  return validation;
}

/**
 * Деактивация лицензии
 */
export function deactivateLicense(): void {
  clearLicense();
}

/**
 * Получение статуса лицензии
 */
export function getLicenseStatus(): {
  hasLicense: boolean;
  isValid: boolean;
  expiresFormatted: string | null;
} {
  const storedKey = loadLicense();

  if (!storedKey) {
    return { hasLicense: false, isValid: false, expiresFormatted: null };
  }

  const validation = validateKeyFormat(storedKey, true);

  return {
    hasLicense: true,
    isValid: validation.valid,
    expiresFormatted: validation.expiresFormatted,
  };
}
