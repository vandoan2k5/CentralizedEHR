from typing import Any

from pydantic import model_validator
from pydantic_settings import BaseSettings
from functools import lru_cache


def _with_postgres_driver(url: str, driver: str) -> str:
    prefixes = (
        "postgresql+asyncpg://",
        "postgresql+psycopg2://",
        "postgresql://",
        "postgres://",
    )
    for prefix in prefixes:
        if url.startswith(prefix):
            return f"postgresql+{driver}://{url.removeprefix(prefix)}"
    return url


class Settings(BaseSettings):
    APP_NAME: str = "CentralizedEHR"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:54322/postgres"
    DATABASE_URL_SYNC: str = "postgresql+psycopg2://postgres:postgres@localhost:54322/postgres"

    REDIS_URL: str = "redis://localhost:6379/0"

    JWT_SECRET: str = "change-me-in-production-use-a-strong-secret"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60

    API_KEY_HEADER: str = "X-API-Key"

    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    @model_validator(mode="before")
    @classmethod
    def normalize_database_urls(cls, values: Any) -> Any:
        if not isinstance(values, dict):
            return values

        database_url = values.get("DATABASE_URL")
        database_url_sync = values.get("DATABASE_URL_SYNC")

        if isinstance(database_url, str):
            values["DATABASE_URL"] = _with_postgres_driver(database_url, "asyncpg")
            if not database_url_sync:
                values["DATABASE_URL_SYNC"] = _with_postgres_driver(database_url, "psycopg2")

        if isinstance(database_url_sync, str):
            values["DATABASE_URL_SYNC"] = _with_postgres_driver(database_url_sync, "psycopg2")
            if not database_url:
                values["DATABASE_URL"] = _with_postgres_driver(database_url_sync, "asyncpg")

        return values

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()
