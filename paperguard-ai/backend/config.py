"""
PaperGuard AI Backend - Configuration
Loads environment variables and provides typed config access.
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Application settings loaded from environment variables."""

    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    SEMANTIC_SCHOLAR_API_KEY: str = os.getenv("SEMANTIC_SCHOLAR_API_KEY", "")
    USE_MOCK_DATA: bool = os.getenv("USE_MOCK_DATA", "false").lower() == "true"
    CORS_ORIGINS: list[str] = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
        ).split(",")
    ]
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

    @property
    def has_llm_key(self) -> bool:
        return bool(self.GROQ_API_KEY)

    @property
    def should_use_mock(self) -> bool:
        return self.USE_MOCK_DATA


settings = Settings()
