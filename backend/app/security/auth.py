"""Security and Authentication utilities."""
import hmac
import hashlib
import time
import base64
import json
from ..config.settings import settings

def hash_password(password: str) -> str:
    """Generate SHA256 hex digest of password."""
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against stored hash with constant-time compare."""
    test_hash = hash_password(plain_password)
    return hmac.compare_digest(test_hash, hashed_password)

def create_access_token(data: dict, expires_in_seconds: int = 86400) -> str:
    """Generate a lightweight HMAC-signed session token."""
    payload = dict(data)
    payload["exp"] = int(time.time()) + expires_in_seconds
    payload_bytes = json.dumps(payload, separators=(',', ':')).encode('utf-8')
    b64_payload = base64.urlsafe_b64encode(payload_bytes).decode('utf-8').rstrip('=')
    
    signature = hmac.new(
        settings.SECRET_KEY.encode('utf-8'),
        b64_payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return f"{b64_payload}.{signature}"

def verify_token(token: str) -> dict:
    """Validate HMAC signature and token expiration."""
    try:
        parts = token.split('.')
        if len(parts) != 2:
            return None
        b64_payload, signature = parts
        
        expected_sig = hmac.new(
            settings.SECRET_KEY.encode('utf-8'),
            b64_payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        if not hmac.compare_digest(signature, expected_sig):
            return None
            
        # Add padding if required
        padding = 4 - (len(b64_payload) % 4)
        if padding != 4:
            b64_payload += '=' * padding
            
        payload = json.loads(base64.urlsafe_b64decode(b64_payload).decode('utf-8'))
        if payload.get("exp", 0) < int(time.time()):
            return None # Expired
        return payload
    except Exception:
        return None
