-- SQL-скрипт для создания таблицы license_keys в YDB
-- Выполните этот скрипт в консоли YDB (вкладка SQL)

CREATE TABLE `license_keys` (
    `key` TEXT NOT NULL,
    `is_activated` Bool,
    `activation_count` Uint32,
    `max_activations` Uint32,
    PRIMARY KEY (`key`)
);
