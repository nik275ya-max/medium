-- SQL-скрипт для добавления тестовых лицензионных ключей
-- Выполните этот скрипт в консоли YDB (вкладка SQL)
-- После тестирования удалите эти ключи или пометьте как активированные

INSERT INTO `license_keys` 
(`key`, `is_activated`, `activation_count`, `max_activations`)
VALUES 
('ELIZA-20251231-A1B2-C3D4', false, 0, 1),
('ELIZA-20260630-X9Y8-Z7W6', false, 0, 3),
('ELIZA-20261231-M5N4-P3Q2', false, 0, 1);

-- Проверка добавленных данных
SELECT * FROM `license_keys`;
