from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parents[2]
_ENV_FILES: tuple[str, ...] = (
    str(_BACKEND_DIR / ".env.development"),
    str(_BACKEND_DIR / ".env.local"),  # optional overrides (gitignored)
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_ENV_FILES,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    postgres_host: str = "localhost"
    postgres_port: int = 5434
    postgres_user: str = "supertodo"
    postgres_password: str = "supertodo_dev"
    postgres_db: str = "supertodo"
    database_url: str = "postgresql+asyncpg://supertodo:supertodo_dev@localhost:5434/supertodo"

    jwt_secret: str = "dev-secret"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 15
    jwt_refresh_token_expire_days: int = 7

    environment: str = "development"
    frontend_url: str = "http://localhost:3003"
    api_v1_prefix: str = "/api/v1"


settings = Settings()
