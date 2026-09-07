# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
from typing import Dict, Any
from models import RestauranteReplica, AssinaturaRestaurante
from observability import insights_gerados
from services.recommendation_strategy import (
    GratuitoInsightStrategy,
    PremiumInsightStrategy
)


class RecommendationService:
    def __init__(self):
        self.gratuito_strategy = GratuitoInsightStrategy()
        self.premium_strategy = PremiumInsightStrategy()

    def get_store_recommendations(
        self,
        db: Session,
        restaurante_id: int
    ) -> Dict[str, Any]:
        """
        Retorna as sugestões e insights analíticos baseados no plano do restaurante.
        Seleciona a estratégia dinamicamente usando Strategy Pattern.
        """
        # Buscar o plano comercial do restaurante na base de réplicas
        restaurante = db.query(RestauranteReplica).filter(RestauranteReplica.id == restaurante_id).first()
        if not restaurante:
            return {
                "status": "ERROR",
                "mensagem": f"Restaurante ID {restaurante_id} não cadastrado no motor de recomendações."
            }

        # O plano vem da tabela de assinaturas (estado próprio), não da réplica.
        # sem assinatura registrada, o restaurante é GRATUITO.
        assinatura = db.query(AssinaturaRestaurante).filter(
            AssinaturaRestaurante.restaurante_id == restaurante_id
        ).first()
        plano = assinatura.plano if assinatura else "GRATUITO"

        # Resolve e aplica a estratégia correspondente baseada no plano comercial
        if plano.upper() == "PREMIUM":
            strategy = self.premium_strategy
        else:
            strategy = self.gratuito_strategy

        # Executa e gera os insights
        insights_gerados.labels(plano=plano.upper()).inc()
        return strategy.gerar_insights(db, restaurante_id)
