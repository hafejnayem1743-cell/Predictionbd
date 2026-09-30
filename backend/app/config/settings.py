"""Configuration settings for WinGo Signal Analyzer Python Backend."""
import os
from dataclasses import dataclass

@dataclass
class Settings:
    PROJECT_NAME: str = "PREDICTION BD"
    API_PREFIX: str = "/api"
    UPSTREAM_API_BASE: str = os.getenv("UPSTREAM_API_BASE", "https://api.hgnicepayapi.com/api/webapi")
    UPSTREAM_ORIGIN: str = os.getenv("UPSTREAM_ORIGIN", "https://hgnice.org")
    UPSTREAM_API_BASES: str = os.getenv("UPSTREAM_API_BASES", "")
    UPSTREAM_RETRIES: int = max(0, min(3, int(os.getenv("UPSTREAM_RETRIES", "1"))))
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./wingo_data.db")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "CHANGE_THIS_IN_PRODUCTION")
    ADMIN_USERNAME: str = os.getenv("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD_HASH: str = os.getenv("ADMIN_PASSWORD_HASH", "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9")  # sha256 of 'admin123'
    SITE_PASSWORD_HASH: str = os.getenv("SITE_PASSWORD_HASH", "751fd3e87272d6e5084765a6d74a0178f6fffeb757b6f556f134ebb4b88f7149")  # sha256 of existing site password
    POLL_INTERVAL_SECONDS: int = int(os.getenv("POLL_INTERVAL_SECONDS", "3"))
    REQUEST_TIMEOUT: float = float(os.getenv("REQUEST_TIMEOUT", "6.0"))

settings = Settings()
