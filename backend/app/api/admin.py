"""Administrative endpoints for monitoring and configuration."""
try:
    from fastapi import APIRouter, HTTPException, Depends, Header
except ImportError:
    class APIRouter:
        def __init__(self, *args, **kwargs): pass
        def get(self, *a, **kw): return lambda f: f
        def post(self, *a, **kw): return lambda f: f
    HTTPException = Exception
    Depends = lambda f: None
    Header = lambda *a, **kw: None

from typing import Optional
from ..config.settings import settings
from ..security.auth import verify_password, create_access_token, verify_token
from ..database.session import get_telemetry_stats

admin_router = APIRouter(prefix="/api/admin", tags=["Admin Portal"])

def get_current_admin(authorization: Optional[str] = Header(None)):
    """Authenticate admin via Bearer token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authentication token")
    token = authorization.split(" ")[1]
    payload = verify_token(token)
    if not payload or payload.get("sub") != settings.ADMIN_USERNAME:
        raise HTTPException(status_code=401, detail="Token expired or unauthorized")
    return payload

@admin_router.post("/login")
def admin_login(data: dict):
    """Authenticate administrator credentials."""
    username = data.get("username", "")
    password = data.get("password", "")
    
    if username != settings.ADMIN_USERNAME:
        raise HTTPException(status_code=401, detail="Invalid username or password")
        
    if not verify_password(password, settings.ADMIN_PASSWORD_HASH):
        raise HTTPException(status_code=401, detail="Invalid username or password")
        
    token = create_access_token({"sub": username, "role": "admin"})
    return {
        "access_token": token,
        "token_type": "Bearer",
        "username": username,
        "expires_in": 86400
    }

@admin_router.get("/overview")
def admin_overview(current_user: dict = Depends(get_current_admin)):
    """Get telemetry, database metrics, and gateway status."""
    stats = get_telemetry_stats()
    return {
        "status": "OPERATIONAL",
        "authenticated_as": current_user.get("sub"),
        "gateway_url": settings.UPSTREAM_API_BASE,
        "database": "SQLite / draw_records",
        "telemetry": stats
    }
