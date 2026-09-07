import os
try:
    # pyrefly: ignore [missing-import]
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # Em produção (Docker), as variáveis já vêm do ambiente

class Config:
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5443/recomendacao_db")
    RABBIT_HOST = os.getenv("RABBIT_HOST", "localhost")
    RABBIT_PORT = int(os.getenv("RABBIT_PORT", "5672"))
    RABBIT_USER = os.getenv("RABBIT_USER", "guest")
    RABBIT_PASS = os.getenv("RABBIT_PASS", "guest")
    RABBIT_URL = os.getenv("RABBIT_URL")
