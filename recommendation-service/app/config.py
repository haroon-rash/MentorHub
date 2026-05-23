from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://postgres:admin@postgres:5432/mentorhub"
    feed_cache_ttl_seconds: int = 300
    tutor_score_cache_ttl_seconds: int = 600
    max_feed_size: int = 24

    class Config:
        env_prefix = ""
        case_sensitive = False


settings = Settings()
