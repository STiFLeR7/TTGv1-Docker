from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database / infra
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/ttg"
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # App
    SECRET_KEY: str = "change-me"
    # Solver
    SOLVER_MAX_TIME_S: float = 10.0

    class Config:
        env_file = ".env"

settings = Settings()
