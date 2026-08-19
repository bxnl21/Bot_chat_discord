from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    worker_token: str
    max_document_bytes: int = 18 * 1024 * 1024
    max_pdf_pages: int = 30
    ocr_language: str = "vie+eng"
