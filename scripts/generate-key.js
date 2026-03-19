/**
 * Скрипт для генерации лицензионных ключей ELIZA с датой истечения
 * Формат: ELIZA-YYYYMMDD-XXXX-XXXX (26 символов)
 * Структура:
 * - ELIZA- (префикс, 6 символов)
 * - YYYYMMDD (8 символов - дата истечения: год 4 цифры, месяц, день)
 * - XXXX (4 символа - контрольная сумма CRC16)
 * - XXXX (4 случайных символа)
 *
 * Пример: ELIZA-20251231-A1B2-C3D4 (действует до 31.12.2025)
 */

import crypto from 'crypto';

const PREFIX = 'ELIZA-';
const CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Генерация случайной строки из символов CHARSET
 */
function randomString(length) {
    let result = '';
    const randomBytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
        result += CHARSET[randomBytes[i] % CHARSET.length];
    }
    return result;
}

/**
 * Вычисление CRC16 контрольной суммы
 */
function crc16(data) {
    let crc = 0xFFFF;
    const table = [];

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
function crcToChecksum(crc) {
    return crc.toString(16).padStart(4, '0').toUpperCase();
}

/**
 * Проверка контрольной суммы
 */
function verifyChecksum(randomPart, checksum) {
    const computedCrc = crc16(randomPart);
    const computedChecksum = crcToChecksum(computedCrc);
    return computedChecksum === checksum.toUpperCase();
}

/**
 * Проверка формата даты YYYYMMDD
 */
function isValidDate(dateStr) {
    if (!/^\d{8}$/.test(dateStr)) return false;

    const year = parseInt(dateStr.substring(0, 4), 10);
    const month = parseInt(dateStr.substring(4, 6), 10);
    const day = parseInt(dateStr.substring(6, 8), 10);

    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;

    // Проверка реального количества дней в месяце
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/**
 * Форматирование даты из YYYYMMDD в читаемый вид
 */
function formatDate(dateStr) {
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${day}.${month}.${year}`;
}

/**
 * Генерация лицензионного ключа с датой истечения
 * @param {string} expiresDate - Дата истечения в формате YYYY-MM-DD
 */
function generateKey(expiresDate) {
    // Преобразование даты из YYYY-MM-DD в YYYYMMDD
    const datePart = expiresDate.replace(/-/g, '');

    if (!isValidDate(datePart)) {
        throw new Error(`Неверный формат даты: ${expiresDate}. Ожидался YYYY-MM-DD`);
    }

    const crc = crc16(datePart);
    const checksum = crcToChecksum(crc);
    const suffix = randomString(4);

    return `${PREFIX}${datePart}-${checksum}-${suffix}`;
}

/**
 * Валидация лицензионного ключа
 * @param {string} key - Ключ для проверки
 * @param {boolean} checkExpiration - Проверять ли дату истечения
 */
function validateKey(key, checkExpiration = true) {
    // Проверка формата
    const formatRegex = /^ELIZA-(\d{8})-([A-Z0-9]{4})-([A-Z0-9]{4})$/;
    const match = key.match(formatRegex);

    if (!match) {
        return {
            valid: false,
            error: 'Неверный формат ключа. Ожидался ELIZA-YYYYMMDD-XXXX-XXXX',
            expiresDate: null,
            expiresFormatted: null
        };
    }

    const datePart = match[1]; // YYYYMMDD
    const checksum = match[2]; // 4 символа контрольной суммы

    // Проверка формата даты
    if (!isValidDate(datePart)) {
        return {
            valid: false,
            error: 'Неверная дата в ключе',
            expiresDate: null,
            expiresFormatted: null
        };
    }

    // Проверка контрольной суммы
    if (!verifyChecksum(datePart, checksum)) {
        return {
            valid: false,
            error: 'Неверная контрольная сумма',
            expiresDate: null,
            expiresFormatted: null
        };
    }

    // Проверка даты истечения
    const expiresFormatted = formatDate(datePart);

    if (checkExpiration) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const year = parseInt(datePart.substring(0, 4), 10);
        const month = parseInt(datePart.substring(4, 6), 10);
        const day = parseInt(datePart.substring(6, 8), 10);
        const expiresDateObj = new Date(year, month - 1, day);

        if (expiresDateObj < today) {
            return {
                valid: false,
                error: `Срок действия ключа истёк ${expiresFormatted}`,
                expiresDate: datePart,
                expiresFormatted: expiresFormatted,
                expired: true
            };
        }
    }

    return {
        valid: true,
        error: null,
        expiresDate: datePart,
        expiresFormatted: expiresFormatted,
        expired: false
    };
}

// Основной блок
const args = process.argv.slice(2);

if (args[0] === '--validate' && args[1]) {
    // Режим валидации
    const key = args[1].toUpperCase();
    const result = validateKey(key, true);

    if (result.valid) {
        console.log(`✓ Ключ валиден`);
        console.log(` Действует до: ${result.expiresFormatted}`);
        console.log(` Ключ: ${key}`);
    } else {
        console.log(`✗ Ошибка: ${result.error}`);
        if (result.expired) {
            console.log(` Истёк: ${result.expiresFormatted}`);
        }
        process.exit(1);
    }
} else if (args[0] === '--batch' && args[1] && args[2]) {
    // Генерация нескольких ключей
    const count = parseInt(args[1], 10);
    const expiresDate = args[2];

    console.log(`Генерация ${count} ключей с датой истечения ${expiresDate}:\n`);

    for (let i = 0; i < count; i++) {
        try {
            const key = generateKey(expiresDate);
            console.log(`${i + 1}. ${key}`);
        } catch (error) {
            console.log(`${i + 1}. Ошибка: ${error.message}`);
        }
    }
} else if (args[0] === '--expires' && args[1]) {
    // Генерация ключа с датой истечения
    const expiresDate = args[1];

    try {
        const key = generateKey(expiresDate);
        const validation = validateKey(key, false);

        console.log('Сгенерированный лицензионный ключ:');
        console.log(`\n${key}\n`);
        console.log(`Действует до: ${validation.expiresFormatted}`);
        console.log(`Проверка: ${validation.valid ? '✓ пройдена' : '✗ не пройдена'}`);
    } catch (error) {
        console.error(`Ошибка: ${error.message}`);
        process.exit(1);
    }
} else {
    // Генерация ключа на 1 год вперёд по умолчанию
    const today = new Date();
    const nextYear = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
    const expiresDate = nextYear.toISOString().split('T')[0];

    try {
        const key = generateKey(expiresDate);
        const validation = validateKey(key, false);

        console.log('Сгенерированный лицензионный ключ (по умолчанию на 1 год):');
        console.log(`\n${key}\n`);
        console.log(`Действует до: ${validation.expiresFormatted}`);
        console.log(`Проверка: ${validation.valid ? '✓ пройдена' : '✗ не пройдена'}`);
        console.log(`\nДля генерации с другой датой используйте:`);
        console.log(` node scripts/generate-key.js --expires YYYY-MM-DD`);
        console.log(`\nПример:`);
        console.log(` node scripts/generate-key.js --expires 2025-12-31`);
    } catch (error) {
        console.error(`Ошибка: ${error.message}`);
        process.exit(1);
    }
}

export { generateKey, validateKey, crc16 };
