"""
Ciclo de vida da réplica analítica.

A ideia central: o conteúdo desta base é *estado derivado*. Tudo que está nas
tabelas de réplica pode ser reconstruído relendo o tópico Kafka desde o snapshot
inicial do Debezium. Isso muda o que uma mudança de schema significa aqui — não
exige migration, exige rebuild.

Sem isso, `Base.metadata.create_all()` cria tabelas novas mas **não altera** as
existentes: uma coluna adicionada ao modelo simplesmente não aparece no banco, e
o consumidor passa a falhar em silêncio contra um volume antigo.
"""
import logging

from sqlalchemy import select
from database import engine, SessionLocal, Base
from models import MetadadoReplica, TABELAS_DERIVADAS
from observability import replica_versao

logger = logging.getLogger("Replica")

# suba este número sempre que mudar o formato das tabelas derivadas.
# O group_id do consumidor deriva dele, então o tópico é relido do início.
VERSAO_SCHEMA_REPLICA = 2

CHAVE_VERSAO = "versao_schema"


def grupo_consumidor() -> str:
    """
    O group_id carrega a versão do schema: ao subir a versão, o consumidor entra
    como um grupo novo, sem offsets, e relê o tópico desde o começo — que é
    exatamente o rebuild.
    """
    return f"ms-recomendacao-cdc-v{VERSAO_SCHEMA_REPLICA}"


def preparar() -> None:
    replica_versao.set(VERSAO_SCHEMA_REPLICA)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        registro = db.execute(
            select(MetadadoReplica).where(MetadadoReplica.chave == CHAVE_VERSAO)
        ).scalar_one_or_none()
        versao_no_banco = int(registro.valor) if registro else None

        if versao_no_banco == VERSAO_SCHEMA_REPLICA:
            logger.info(f"Réplica na versão {VERSAO_SCHEMA_REPLICA}. Nada a fazer.")
            return

        logger.warning(
            f"Schema da réplica desatualizado (banco={versao_no_banco}, "
            f"código={VERSAO_SCHEMA_REPLICA}). Reconstruindo a partir do CDC."
        )

        # só as tabelas derivadas caem. Assinaturas e metadados são estado
        # próprio deste serviço e sobrevivem ao rebuild.
        Base.metadata.drop_all(bind=engine, tables=TABELAS_DERIVADAS)
        Base.metadata.create_all(bind=engine, tables=TABELAS_DERIVADAS)

        if registro:
            registro.valor = str(VERSAO_SCHEMA_REPLICA)
        else:
            db.add(MetadadoReplica(chave=CHAVE_VERSAO, valor=str(VERSAO_SCHEMA_REPLICA)))
        db.commit()
        logger.info("Réplica reconstruída. O consumidor relerá o tópico desde o início.")
    except Exception as e:
        db.rollback()
        logger.error(f"Falha ao preparar a réplica: {e}")
        raise
    finally:
        db.close()
