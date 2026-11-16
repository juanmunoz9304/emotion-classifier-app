from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    azure_prediction_url: str
    azure_prediction_key: str
    allowed_origins: str = "http://localhost:4200"
    max_image_size_bytes: int = 4 * 1024 * 1024

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings() # type: ignore[call-arg]