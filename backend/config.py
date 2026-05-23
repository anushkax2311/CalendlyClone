from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "mysql+pymysql://root:password@localhost:3306/calendly_clone"
    SECRET_KEY: str = "changeme-in-production"

    # Email (Gmail SMTP — use an App Password, NOT your real Gmail password)
    EMAIL_ENABLED: bool = False
    EMAIL_HOST: str = "smtp.gmail.com"
    EMAIL_PORT: int = 587
    EMAIL_USERNAME: str = ""          # your Gmail address
    EMAIL_PASSWORD: str = ""          # Gmail App Password (16 chars)
    EMAIL_FROM_NAME: str = "Calendly Clone"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
