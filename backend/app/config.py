from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_HOURS: int = 8
    CORS_ORIGINS: List[str] = ["http://localhost:5173"]
    # Cualquier IP de red local en el puerto del frontend (la IP de la PC cambia con DHCP)
    CORS_ORIGIN_REGEX: str = r"http://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+):5173"

    class Config:
        env_file = ".env"


settings = Settings()
