import os
from dataclasses import dataclass
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from backend/.env file
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")



@dataclass
class Settings:
    openai_api_key: str
    openai_base_url: str | None
    chat_model: str
    embedding_model: str
    top_k: int
    chunk_size: int
    chunk_overlap: int
    db_path: Path = Path("storage/rag.db")


def get_settings() -> Settings:
    return Settings(
        openai_api_key=os.getenv("OPENAI_API_KEY", ""),
        openai_base_url=os.getenv("OPENAI_BASE_URL") or None,
        chat_model=os.getenv("OPENAI_MODEL_CHAT", "gpt-4o-mini"),
        embedding_model=os.getenv("OPENAI_MODEL_EMBEDDING", "text-embedding-3-small"),
        top_k=int(os.getenv("TOP_K", "4")),
        chunk_size=int(os.getenv("CHUNK_SIZE", "700")),
        chunk_overlap=int(os.getenv("CHUNK_OVERLAP", "120")),
        db_path=Path(os.getenv("DATABASE_PATH", "storage/rag.db")),
    )

