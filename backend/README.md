# Бэкенд для активации лицензий Элиза

## 🎯 Проблема

Cloud Function Яндекс Cloud **не имеет прямого сетевого доступа** к YDB API через HTTPS. gRPC драйвер также не подключается.

## ✅ Решение

Использовать **YDB SDK внутри Cloud Function** с правильной аутентификацией через сервисный аккаунт.

---

## 📁 Структура

```
backend/
├── function/
│   ├── index.py              # Код Cloud Function
│   └── requirements.txt      # ydb>=3.0.0
└── README.md
```

---

## 🔧 Настройка

### 1. Переменные окружения функции

| Ключ | Значение |
|------|----------|
| `YDB_DATABASE` | `/ru-central1/b1g3h48bojrd81sfbnvu/etnqltdb4070i3801bj0` |

**Не добавляйте `YDB_ENDPOINT`** — он указан в коде.

### 2. Права доступа в YDB

YDB → база данных → **Права доступа** → добавить сервисный аккаунт функции:

- **Субъект**: `eliza-db-user` (или ID сервисного аккаунта `aje...`)
- **Роль**: `ydb.admin`

### 3. Таймаут функции

Cloud Functions → функция → Настройки → **Таймаут**: **30 секунд**

---

## 📝 Код функции (index.py)

```python
import json
import os
from datetime import datetime
from typing import Dict, Any, Optional
import urllib.request

import ydb
from ydb import credentials

YDB_DATABASE = os.getenv("YDB_DATABASE")
YDB_ENDPOINT = "grpcs://ydb.serverless.yandexcloud.net:2135"
TABLE_PATH = "license_keys"


class MetadataCredentials(credentials.Credentials):
    def __init__(self):
        self._token = None
        self._refresh()
    
    def _refresh(self):
        try:
            url = "http://169.254.169.254/computeMetadata/v1/instance/service-accounts/default/token"
            req = urllib.request.Request(url, headers={"Metadata-Flavor": "Google"})
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode())
                self._token = data.get("access_token", "")
        except Exception as e:
            self._token = ""
    
    def token(self, driver=None):
        return self._token
    
    def async_token(self, driver=None):
        return self._token
    
    def auth_metadata(self, driver=None):
        return [("authorization", f"Bearer {self._token}")]


def validate_key_format(key: str) -> Dict[str, Any]:
    import re
    normalized_key = key.upper().strip()
    match = re.match(r"^ELIZA-(\d{8})-([A-Z0-9]{4})-([A-Z0-9]{4})$", normalized_key)
    
    if not match:
        return {"valid": False, "error": "Неверный формат ключа", "expires_date": None, "expires_formatted": None}
    
    date_part = match.group(1)
    try:
        year, month, day = int(date_part[0:4]), int(date_part[4:6]), int(date_part[6:8])
        expires_date = datetime(year, month, day)
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        
        if expires_date < today:
            return {"valid": False, "error": f"Срок действия истёк {day:02d}.{month:02d}.{year}", "expires_date": date_part, "expires_formatted": f"{day:02d}.{month:02d}.{year}", "expired": True}
    except ValueError:
        return {"valid": False, "error": "Неверная дата", "expires_date": None, "expires_formatted": None}
    
    return {"valid": True, "error": None, "expires_date": date_part, "expires_formatted": f"{day:02d}.{month:02d}.{year}", "expired": False}


def run_query(driver, query, params=None):
    def callback(session):
        result = session.execute(query, params or {}, commit_tx=True)
        return result.result_set.rows if result.result_set.rows else None
    try:
        return driver.retry_operation_sync(callback, timeout=5)
    except Exception:
        return None


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }
    
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}
    
    try:
        body_str = event.get("body", "")
        if not body_str:
            return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "Тело запроса пустое"})}
        
        body = json.loads(body_str)
        key = body.get("key", "").strip()
        
        validation = validate_key_format(key)
        if not validation["valid"]:
            return {"statusCode": 400, "headers": headers, "body": json.dumps(validation)}
        
        # Создаём драйвер
        creds = MetadataCredentials()
        driver = ydb.Driver(endpoint=YDB_ENDPOINT, database=YDB_DATABASE, credentials=creds)
        driver.wait(timeout=15)
        
        try:
            # Проверка ключа
            rows = run_query(driver, f"SELECT key, is_activated, activation_count, max_activations FROM `{TABLE_PATH}` WHERE key = $key", {"$key": key})
            
            if not rows:
                return {"statusCode": 404, "headers": headers, "body": json.dumps({"valid": False, "error": "Ключ не найден", **validation})}
            
            row = rows[0]
            license_data = {
                "key": str(row.key),
                "is_activated": bool(row.is_activated),
                "activation_count": int(row.activation_count),
                "max_activations": int(row.max_activations),
            }
            
            # Проверка лимита
            if license_data["is_activated"] and license_data["activation_count"] >= license_data["max_activations"]:
                return {"statusCode": 200, "headers": headers, "body": json.dumps({"valid": True, "already_activated": True, **license_data, "expires_formatted": validation["expires_formatted"]})}
            
            # Активация
            run_query(driver, f"UPDATE `{TABLE_PATH}` SET is_activated = true, activation_count = activation_count + 1 WHERE key = $key", {"$key": key})
            
            return {"statusCode": 200, "headers": headers, "body": json.dumps({"valid": True, "activated": True, "activation_count": license_data["activation_count"] + 1, "max_activations": license_data["max_activations"], "expires_formatted": validation["expires_formatted"]})}
        
        finally:
            driver.stop()
    
    except Exception as e:
        return {"statusCode": 500, "headers": headers, "body": json.dumps({"error": "Внутренняя ошибка", "details": str(e)})}
```

---

## 📝 requirements.txt

```
ydb>=3.0.0
```

---

## 🧪 Тестирование

```bash
curl -X POST https://functions.yandexcloud.net/d4e8p6tnvethbrfmivo5 \
  -H "Content-Type: application/json" \
  -d '{"key": "ELIZA-20260630-X9Y8-Z7W6"}'
```

---

## 🔍 Если gRPC не подключается

Проблема может быть в **сетевых настройках**. Попробуйте:

1. **Убедитесь, что функция и YDB в одном каталоге**
2. **Проверьте права доступа** в YDB (сервисный аккаунт функции должен иметь `ydb.admin`)
3. **Увеличьте таймаут** функции до 30 секунд

---

## 🎯 Альтернатива: Использовать PostgreSQL

Если YDB не работает, создайте **Cloud Database for PostgreSQL** и используйте `psycopg2` вместо `ydb`.
