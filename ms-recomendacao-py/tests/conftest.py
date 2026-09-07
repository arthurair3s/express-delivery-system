"""
Infraestrutura de teste do MS de Recomendação.

Os handlers de CDC são exercitados contra um SQLite em memória: os modelos usam
só tipos portáveis, então o comportamento que interessa — convergência,
idempotência e ordem — é o mesmo do PostgreSQL, sem precisar de contêiner.
"""
import os
import sys
from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

RAIZ = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RAIZ / "src"))

# database.py cria o engine no import; sem isto ele tentaria resolver a URL real
os.environ.setdefault("DATABASE_URL", "sqlite://")

from database import Base  # noqa: E402
import models  # noqa: E402,F401  (garante o registro das tabelas no metadata)


@pytest.fixture
def sessao(monkeypatch):
    """Banco limpo por teste, com o SessionLocal do consumidor redirecionado."""
    engine = create_engine("sqlite://")
    Base.metadata.create_all(bind=engine)
    Fabrica = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    import messaging.kafka_consumer as consumidor
    monkeypatch.setattr(consumidor, "SessionLocal", Fabrica)

    db = Fabrica()
    try:
        yield db
    finally:
        db.close()


def envelope(op: str, after: dict | None = None, before: dict | None = None) -> dict:
    """Monta o envelope que o Debezium entrega com schemas.enable=false."""
    return {"op": op, "after": after, "before": before, "ts_ms": 1, "source": {}}
