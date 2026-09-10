import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "AnnaSetu Procurement Platform API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./annasetu.db")
    DEMO_MODE: bool = True
    CORS_ORIGINS: list[str] = ["*"]
    
    # Recommendation weights
    WEIGHT_WAIT: float = 0.35
    WEIGHT_CAPACITY: float = 0.25
    WEIGHT_DISTANCE: float = 0.20
    WEIGHT_TIME_MATCH: float = 0.10
    WEIGHT_CONGESTION: float = 0.10

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
