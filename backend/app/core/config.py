from pathlib import Path
from typing import List, Tuple
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
_ENV_FILES: Tuple[str, ...] = (
    str(_BACKEND_DIR / ".env"),
    str(_BACKEND_DIR.parent / ".env"),
    ".env",
    "backend/.env",
)

class Settings(BaseSettings):
    model_config = SettingsConfigDict(case_sensitive=True, env_file=_ENV_FILES, extra="ignore")

    PROJECT_NAME: str = "CEEP+ API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    
    # JWT Settings
    SECRET_KEY: str = "ceep_plus_super_secret_key_expoceep_2026_cascavel"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 dias
    
    # Database Settings
    DATABASE_URL: str = "sqlite:///./ceep_plus.db"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"
    ]

settings = Settings()
