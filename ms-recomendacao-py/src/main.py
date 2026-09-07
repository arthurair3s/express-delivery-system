import threading
import os
from contextlib import asynccontextmanager
# pyrefly: ignore [missing-import]
from opentelemetry import trace
# pyrefly: ignore [missing-import]
from opentelemetry.sdk.trace import TracerProvider
# pyrefly: ignore [missing-import]
from opentelemetry.sdk.trace.export import BatchSpanProcessor
# pyrefly: ignore [missing-import]
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
# pyrefly: ignore [missing-import]
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
# pyrefly: ignore [missing-import]
from opentelemetry.sdk.resources import Resource


# inicializa o opentelemetry provider e exportador otlp grpc
otel_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317")
otel_service_name = os.getenv("OTEL_SERVICE_NAME", "ms-recomendacao")

resource = Resource.create(attributes={"service.name": otel_service_name})
provider = TracerProvider(resource=resource)
processor = BatchSpanProcessor(OTLPSpanExporter(endpoint=otel_endpoint, insecure=True))
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)

# pyrefly: ignore [missing-import]
from fastapi import FastAPI, Depends, HTTPException, Query
# pyrefly: ignore [missing-import]
from pydantic import BaseModel
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
from database import engine, Base, get_db
# pyrefly: ignore [missing-import]
from models import RestauranteReplica, ProdutoReplica, AssinaturaRestaurante
# pyrefly: ignore [missing-import]
from prometheus_client import make_asgi_app
from messaging.kafka_consumer import KafkaCDCConsumer
import replica
from services.recommendation_service import RecommendationService

# cria as tabelas e, se o schema das tabelas derivadas mudou, as reconstrói —
# o conteúdo volta pelo replay do tópico Kafka. Ver replica.py.
replica.preparar()

# este serviço é um read-model puro: todo o seu estado — catálogo, pedidos e
# itens vendidos — é derivado do WAL do banco principal via Debezium. Ele não
# consome RabbitMQ, porque não recebe trabalho, apenas replica dados.
cdc_consumer = KafkaCDCConsumer()
recommendation_service = RecommendationService()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # O catálogo chega pelo snapshot inicial do Debezium — não há mais um seed
    # local com uma cópia manual dos restaurantes e produtos.
    cdc_consumer.start()
    print("[Main] Consumer CDC (Kafka/Debezium) iniciado em background.")

    # inicia o servidor gRPC em background
    # pyrefly: ignore [missing-import]
    from grpc_server import start_grpc_server
    grpc_thread = threading.Thread(target=start_grpc_server, daemon=True)
    grpc_thread.start()
    print("[Main] Servidor gRPC iniciado em background na porta 50053.")
    yield
    print("[Main] Parando consumer CDC...")
    cdc_consumer.stop()



app = FastAPI(
    title="MS Recomendacao B2B (Python)",
    description="Motor de inteligência competitiva e precificação inteligente para restaurantes",
    version="1.0.0",
    lifespan=lifespan
)

# o Prometheus raspa /metrics na mesma porta do FastAPI. as métricas de negócio
# ficam em observability.py e são incrementadas pelo consumidor de CDC.
app.mount("/metrics", make_asgi_app())

# instrumenta o app fastapi para gerar traces automáticos
FastAPIInstrumentor.instrument_app(app)


class AssinaturaRequest(BaseModel):
    restaurante_id: int
    plano: str  # PREMIUM ou GRATUITO


@app.get("/health")
def health_check():
    return {"status": "UP", "service": "ms-recomendacao"}


@app.get("/recomendacoes/lojas")
def get_store_insights(
    restaurante_id: int = Query(..., description="ID da loja/restaurante para geração de insights"),
    db: Session = Depends(get_db)
):
    """Retorna insights competitivos de preço e sugestões promocionais baseados no plano da loja (Strategy Pattern)."""
    try:
        insights = recommendation_service.get_store_recommendations(
            db=db,
            restaurante_id=restaurante_id
        )
        return insights
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro interno no motor analítico B2B: {e}")


@app.post("/assinaturas")
def atualizar_plano(
    request: AssinaturaRequest,
    db: Session = Depends(get_db)
):
    """Atualiza o plano comercial de um restaurante (simulando ativação da assinatura)."""
    plano_upper = request.plano.upper()
    if plano_upper not in ["PREMIUM", "GRATUITO"]:
        raise HTTPException(status_code=400, detail="Plano inválido. Use 'PREMIUM' ou 'GRATUITO'")

    restaurante = db.query(RestauranteReplica).filter(RestauranteReplica.id == request.restaurante_id).first()
    if not restaurante:
        raise HTTPException(status_code=404, detail="Restaurante não encontrado no banco de recomendações.")

    assinatura = db.query(AssinaturaRestaurante).filter(
        AssinaturaRestaurante.restaurante_id == request.restaurante_id
    ).first()
    if assinatura:
        assinatura.plano = plano_upper
    else:
        db.add(AssinaturaRestaurante(restaurante_id=request.restaurante_id, plano=plano_upper))
    db.commit()
    print(f"[Main] Plano do restaurante #{request.restaurante_id} alterado para {plano_upper}.")
    return {
        "restaurante_id": request.restaurante_id,
        "plano": plano_upper,
        "message": f"Assinatura do restaurante atualizada para {plano_upper} com sucesso."
    }


if __name__ == "__main__":
    # pyrefly: ignore [missing-import]
    import uvicorn
    # executa o servidor na porta 8001
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=False)
