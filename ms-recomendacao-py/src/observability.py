"""
Métricas de negócio do MS de Recomendação.

o serviço é um read-model: o que interessa medir não é latência de requisição,
e sim se a réplica está acompanhando a origem. um consumidor parado não gera
erro nenhum — ele simplesmente para de contar, e é isso que estes contadores
tornam visível.
"""
# pyrefly: ignore [missing-import]
from prometheus_client import Counter, Gauge

eventos_cdc = Counter(
    "cdc_eventos_aplicados_total",
    "Eventos de CDC aplicados na réplica",
    ["tabela", "operacao"],
)

eventos_cdc_erro = Counter(
    "cdc_eventos_erro_total",
    "Eventos de CDC que falharam ao ser aplicados",
    ["tabela"],
)

insights_gerados = Counter(
    "insights_gerados_total",
    "Consultas de insights atendidas, particionadas por plano",
    ["plano"],
)

replica_versao = Gauge(
    "replica_schema_versao",
    "Versão do schema das tabelas derivadas em uso",
)
