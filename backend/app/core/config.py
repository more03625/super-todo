from pathlib import Path

from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parents[2]

_ENV_FILES = (
    str(_BACKEND_DIR / ".env.development"),
    str(_BACKEND_DIR / ".env.local"),
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_ENV_FILES,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # PostgreSQL
    postgres_host: str = "localhost"
    postgres_port: int = 5434
    postgres_user: str = "supertodo"
    postgres_password: str = "supertodo_dev"
    postgres_db: str = "supertodo"

    # Render/Supabase DATABASE_URL
    DATABASE_URL: str | None = None

    @computed_field
    @property
    def database_url(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL

        return (
            f"postgresql+asyncpg://"
            f"{self.postgres_user}:"
            f"{self.postgres_password}@"
            f"{self.postgres_host}:"
            f"{self.postgres_port}/"
            f"{self.postgres_db}"
        )

    # JWT
    jwt_secret: str = "dev-secret"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 15
    jwt_refresh_token_expire_days: int = 7

    # Environment
    environment: str = "development"

    # Frontend URL
    frontend_url: str = "http://localhost:3003,http://localhost:3000,https://super-todo-rm.netlify.app"

    api_v1_prefix: str = "/api/v1"

    @property
    def cors_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.frontend_url.split(",")
            if origin.strip()
        ]


settings = Settings()