from pathlib import Path
from typing import List, Optional, Union
from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ROOT_DIR = BACKEND_DIR.parent

DEV_DEFAULT_SECRET_KEY: str = "dev-insecure-secret-key-change-in-production-mock-interviewer-2026"
KNOWN_INSECURE_SECRET_KEYS = {
    DEV_DEFAULT_SECRET_KEY.lower(),
    "your_jwt_secret_key_here",
    "secret",
    "secretkey",
    "changeme",
    "password",
    "admin",
    "12345678",
    "mockinterviewer",
    "development",
}
LOOPBACK_HOSTS = ("localhost", "127.0.0.1", "0.0.0.0", "[::1]")


class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Technical Mock Interviewer API"
    VERSION: str = "0.1.0"
    API_V1_PREFIX: str = "/api"
    ENVIRONMENT: str = "development"
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    # Database Configuration (PostgreSQL + asyncpg)
    DATABASE_URL: Optional[str] = Field(default=None, repr=False)

    # Gemini AI Configuration
    GEMINI_API_KEY: Optional[str] = Field(default=None, repr=False)
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # OpenAI Realtime Configuration (Voice Interviewer)
    OPENAI_API_KEY: Optional[str] = Field(default=None, repr=False)
    OPENAI_REALTIME_MODEL: str = "gpt-realtime"
    OPENAI_REALTIME_VOICE: str = "verse"

    # Authentication & Security Configuration
    SECRET_KEY: str = Field(default=DEV_DEFAULT_SECRET_KEY, repr=False)
    ALGORITHM: str = "HS256"
    SESSION_EXPIRE_DAYS: int = 7
    PASSWORD_RESET_TOKEN_EXPIRE_HOURS: int = 1
    AUTH_COOKIE_NAME: str = "session_token"
    AUTH_COOKIE_SECURE: bool = False
    AUTH_COOKIE_SAMESITE: str = "lax"
    AUTH_COOKIE_DOMAIN: Optional[str] = None
    FRONTEND_URL: str = "http://localhost:5173"

    @field_validator("GEMINI_API_KEY", "OPENAI_API_KEY", mode="before")
    @classmethod
    def assemble_api_key(cls, v: Optional[str]) -> Optional[str]:
        if isinstance(v, str):
            cleaned = v.strip().strip('"').strip("'")
            return cleaned if cleaned else None
        return v

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if not v.startswith("["):
                return [i.strip() for i in v.split(",") if i.strip()]
        return v

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_database_url(cls, v: Optional[str]) -> Optional[str]:
        if isinstance(v, str) and v.strip():
            url = v.strip()
            # Normalize standard postgres/postgresql scheme to asyncpg
            if url.startswith("postgresql://"):
                return url.replace("postgresql://", "postgresql+asyncpg://", 1)
            elif url.startswith("postgres://"):
                return url.replace("postgres://", "postgresql+asyncpg://", 1)
            return url
        return v

    @property
    def is_production(self) -> bool:
        """Check if running in a production environment."""
        return str(self.ENVIRONMENT).strip().lower() in ("production", "prod")

    def validate_production_security(self) -> None:
        """Enforces security constraints for production and credentialed CORS configurations.

        Validation rules:
        1. Wildcard CORS: '*' and 'null' origins are strictly forbidden when credentialed requests
           (allow_credentials=True) are enabled across all environments.
        2. Production Secrets: When ENVIRONMENT is production, SECRET_KEY must be explicitly configured,
           cannot be the default dev secret or a known insecure placeholder, and must be at least 32
           characters long. Secret values are never leaked in error messages.
        3. Production Cookies: In production, AUTH_COOKIE_SECURE is automatically enforced to True.
        4. Production CORS: In production, CORS_ORIGINS must not be empty, cannot only contain loopback/development
           origins (e.g. localhost), and non-loopback origins must use HTTPS.
        """
        # 1. CORS validation (all environments when credentialed requests are enabled)
        for origin in self.CORS_ORIGINS:
            clean_origin = str(origin).strip()
            if clean_origin == "*":
                raise ValueError(
                    "CORS security configuration error: Wildcard origin '*' cannot be used "
                    "when credentialed requests (allow_credentials=True) are enabled."
                )
            if clean_origin.lower() == "null":
                raise ValueError(
                    "CORS security configuration error: Origin 'null' is unsafe and cannot be used."
                )

        if not self.is_production:
            return

        # 2. Production Secret Key validation
        secret_val = str(self.SECRET_KEY).strip() if self.SECRET_KEY else ""
        if not secret_val:
            raise ValueError(
                "Production security configuration error: SECRET_KEY is missing. "
                "A strong, cryptographically secure SECRET_KEY (minimum 32 characters) must be configured in production."
            )

        if secret_val == DEV_DEFAULT_SECRET_KEY or secret_val.lower() in KNOWN_INSECURE_SECRET_KEYS:
            raise ValueError(
                "Production security configuration error: Insecure or default SECRET_KEY detected. "
                "The development default SECRET_KEY cannot be used in production. "
                "Configure a strong, cryptographically random SECRET_KEY (minimum 32 characters)."
            )

        if len(secret_val) < 32:
            raise ValueError(
                "Production security configuration error: SECRET_KEY is too short "
                "(minimum 32 characters required for cryptographic security in production)."
            )

        # 3. Production Cookie Security
        self.AUTH_COOKIE_SECURE = True

        # 4. Production CORS validation
        if not self.CORS_ORIGINS:
            raise ValueError(
                "Production security configuration error: CORS_ORIGINS must not be empty in production. "
                "Explicit production frontend origins (e.g. 'https://yourdomain.com') are required."
            )

        is_all_loopback = all(
            any(lh in str(orig).lower().strip() for lh in LOOPBACK_HOSTS)
            for orig in self.CORS_ORIGINS
        )
        if is_all_loopback:
            raise ValueError(
                "Production security configuration error: CORS_ORIGINS cannot only contain "
                "local development origins (localhost/127.0.0.1) in production. "
                "Explicit production frontend origins must be configured."
            )

        for origin in self.CORS_ORIGINS:
            clean_origin = str(origin).lower().strip()
            is_loopback = any(lh in clean_origin for lh in LOOPBACK_HOSTS)
            if not is_loopback and not clean_origin.startswith("https://"):
                raise ValueError(
                    "Production security configuration error: Insecure HTTP origin is not allowed in production. "
                    "All production origins must use HTTPS."
                )

    @model_validator(mode="after")
    def _validate_security(self) -> "Settings":
        self.validate_production_security()
        return self

    model_config = SettingsConfigDict(
        env_file=(
            str(BACKEND_DIR / ".env"),
            str(ROOT_DIR / ".env"),
            ".env",
        ),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
