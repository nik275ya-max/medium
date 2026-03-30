import json
import os
import urllib.request
from datetime import datetime
from typing import Dict, Any, Optional

# YDB Database
YDB_DATABASE = os.getenv("YDB_DATABASE")
print(f"[DEBUG] YDB_DATABASE: {YDB_DATABASE}")

# Таблица лицензий
TABLE_PATH = "license_keys"


def get_iam_token() -> str:
    """Получение IAM-токена из метаданных"""
    try:
        url = "http://169.254.169.254/computeMetadata/v1/instance/service-accounts/default/token"
        req = urllib.request.Request(url, headers={"Metadata-Flavor": "Google"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
            token = data.get("access_token", "")
            return token
    except Exception as e:
        print(f"[DEBUG] Token error: {e}")
        return ""


def ydb_request(path: str, body: dict) -> dict:
    """Выполнение запроса к YDB API"""
    iam_token = get_iam_token()
    
    if not iam_token:
        raise Exception("Нет IAM-токена")
    
    # Пробуем разные endpoint
    endpoints = [
        "https://ydb.cloud.yandex.ru",
        "https://ydb.serverless.yandexcloud.net",
    ]
    
    last_error = None
    
    for base_url in endpoints:
        url = f"{base_url}{path}"
        print(f"[DEBUG] Trying URL: {url}")
        
        try:
            data = json.dumps(body).encode('utf-8')
            req = urllib.request.Request(
                url,
                data=data,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {iam_token}",
                    "X-Ydb-Database": YDB_DATABASE,
                },
                method="POST"
            )
            
            with urllib.request.urlopen(req, timeout=10) as response:
                result = json.loads(response.read().decode())
                print(f"[DEBUG] Success! Response: {result}")
                return result
                
        except Exception as e:
            print(f"[DEBUG] Failed: {e}")
            last_error = e
            continue
    
    raise last_error or Exception("Все endpoint не доступны")


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


def check_license_in_db(key: str) -> Optional[Dict[str, Any]]:
    try:
        # Используем Query Service API
        body = {
            "db": YDB_DATABASE,
            "query": f"SELECT key, is_activated, activation_count, max_activations FROM `{TABLE_PATH}` WHERE key = $key",
            "parameters": {"$key": key}
        }
        
        result = ydb_request("/query-service/v1/execute", body)
        
        if "result_sets" in result and result["result_sets"]:
            rows = result["result_sets"][0].get("rows", [])
            if rows:
                row = rows[0]
                return {
                    "key": row.get("key"),
                    "is_activated": row.get("is_activated"),
                    "activation_count": row.get("activation_count"),
                    "max_activations": row.get("max_activations"),
                }
        return None
    except Exception as e:
        print(f"[DEBUG] Query error: {e}")
        return None


def activate_license_in_db(key: str) -> bool:
    try:
        body = {
            "db": YDB_DATABASE,
            "query": f"UPDATE `{TABLE_PATH}` SET is_activated = true, activation_count = activation_count + 1 WHERE key = $key",
            "parameters": {"$key": key}
        }
        ydb_request("/query-service/v1/execute", body)
        return True
    except Exception as e:
        print(f"[DEBUG] Update error: {e}")
        return False


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
        print("[DEBUG] Handler started")
        
        body_str = event.get("body", "")
        if not body_str:
            return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "Тело запроса пустое"})}
        
        body = json.loads(body_str)
        key = body.get("key", "").strip()
        print(f"[DEBUG] Key: {key}")
        
        validation = validate_key_format(key)
        if not validation["valid"]:
            return {"statusCode": 400, "headers": headers, "body": json.dumps(validation)}
        
        # Проверка ключа
        license_data = check_license_in_db(key)
        print(f"[DEBUG] License data: {license_data}")
        
        if not license_data:
            return {"statusCode": 404, "headers": headers, "body": json.dumps({"valid": False, "error": "Ключ не найден", **validation})}
        
        # Проверка лимита
        if license_data["is_activated"] and license_data["activation_count"] >= license_data["max_activations"]:
            return {"statusCode": 200, "headers": headers, "body": json.dumps({"valid": True, "already_activated": True, **license_data, "expires_formatted": validation["expires_formatted"]})}
        
        # Активация
        if activate_license_in_db(key):
            return {"statusCode": 200, "headers": headers, "body": json.dumps({"valid": True, "activated": True, "activation_count": license_data["activation_count"] + 1, "max_activations": license_data["max_activations"], "expires_formatted": validation["expires_formatted"]})}
        else:
            return {"statusCode": 500, "headers": headers, "body": json.dumps({"error": "Ошибка активации"})}
    
    except Exception as e:
        print(f"[DEBUG] Handler error: {e}")
        return {"statusCode": 500, "headers": headers, "body": json.dumps({"error": "Внутренняя ошибка", "details": str(e)})}
