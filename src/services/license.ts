import type { LicenseValidationResult } from '../types';

// URL вашего бэкенда на Timeweb
const BACKEND_URL = 'https://nik275ya-max-eliza-backend-107f.twc1.net';

const STORAGE_KEY = 'eliza-license-key';

/**
 * Валидация формата ключа (клиентская)
 */
function validateKeyFormat(key: string): LicenseValidationResult {
    const normalizedKey = key.toUpperCase().trim();
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

    // Проверка даты
    const year = parseInt(datePart.substring(0, 4), 10);
    const month = parseInt(datePart.substring(4, 6), 10);
    const day = parseInt(datePart.substring(6, 8), 10);

    if (month < 1 || month > 12 || day < 1 || day > 31) {
        return {
            valid: false,
            error: 'Неверная дата в ключе',
            expiresDate: null,
            expiresFormatted: null,
        };
    }

    const expiresFormatted = `${day.toString().padStart(2, '0')}.${month.toString().padStart(2, '0')}.${year}`;

    // Проверка истечения
    const today = new Date();
    today.setHours(0, 0, 0, 0);
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
    localStorage.setItem(STORAGE_KEY, key);
}

/**
 * Загрузка ключа из localStorage
 */
function loadLicense(): string | null {
    return localStorage.getItem(STORAGE_KEY);
}

/**
 * Удаление ключа
 */
function clearLicense(): void {
    localStorage.removeItem(STORAGE_KEY);
}

/**
 * Активация лицензионного ключа через API
 * 
 * Порядок:
 * 1. Валидация формата
 * 2. Запрос на бэкенд для проверки/активации
 * 3. Сохранение в localStorage ТОЛЬКО после успешной активации
 */
export async function activateLicense(key: string): Promise<LicenseValidationResult> {
    // Шаг 1: Валидация формата
    const validation = validateKeyFormat(key);
    if (!validation.valid) {
        return validation;
    }

    // Шаг 2: Запрос на бэкенд
    try {
        const response = await fetch(`${BACKEND_URL}/api/v1/license/activate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ key }),
        });

        const data = await response.json();

        // Шаг 3: Сохраняем в localStorage ТОЛЬКО если бэкенд вернул успех
        if (response.ok && data.valid && (data.activated || data.already_activated)) {
            saveLicense(key);
            
            return {
                valid: true,
                error: null,
                expiresDate: validation.expiresDate,
                expiresFormatted: validation.expiresFormatted,
                expired: false,
            };
        } else {
            // Бэкенд вернул ошибку - не сохраняем
            return {
                valid: false,
                error: data.error || 'Ошибка активации',
                expiresDate: validation.expiresDate,
                expiresFormatted: validation.expiresFormatted,
                expired: false,
            };
        }
    } catch (error) {
        console.error('License activation error:', error);
        return {
            valid: false,
            error: 'Ошибка соединения с сервером',
            expiresDate: validation.expiresDate,
            expiresFormatted: validation.expiresFormatted,
            expired: false,
        };
    }
}

/**
 * Проверка лицензии при запуске
 * 
 * Если ключ есть в localStorage и валиден - бэкенд НЕ опрашиваем!
 * Бэкенд нужен только для первичной активации.
 */
export async function checkLicense(): Promise<LicenseValidationResult> {
    const storedKey = loadLicense();

    if (!storedKey) {
        return {
            valid: false,
            error: 'Лицензионный ключ не найден',
            expiresDate: null,
            expiresFormatted: null,
        };
    }

    // Проверяем формат и дату локально - бэкенд НЕ нужен!
    const validation = validateKeyFormat(storedKey);
    
    if (!validation.valid) {
        // Ключ невалиден - удаляем из localStorage
        clearLicense();
        return validation;
    }

    // Ключ валиден и дата не истекла - всё ок!
    return {
        valid: true,
        error: null,
        expiresDate: validation.expiresDate,
        expiresFormatted: validation.expiresFormatted,
        expired: false,
    };
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

    const validation = validateKeyFormat(storedKey);

    return {
        hasLicense: true,
        isValid: validation.valid,
        expiresFormatted: validation.expiresFormatted,
    };
}
