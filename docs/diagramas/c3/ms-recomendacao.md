# C3 — MS Recomendação

> **Contêiner aberto:** MS Recomendação · **Stack:** Python 3.12 · FastAPI · gRPC · SQLAlchemy · kafka-python

Motor de inteligência competitiva de precificação B2B. É um **read-model puro**:
não recebe trabalho de ninguém, apenas mantém uma cópia analítica do banco
principal e responde consultas sobre ela. Por isso não consome RabbitMQ.

```mermaid
graph TB
    classDef comp fill:#85bbf0,stroke:#6699cc,stroke-width:2px,color:#000;
    classDef port fill:#e9c46a,stroke:#f4a261,stroke-width:2px,color:#000;
    classDef ext fill:#999999,stroke:#777777,stroke-width:2px,color:#fff;

    api["Backend Core"]:::ext
    kafka["Kafka<br>dbserver1.public.*"]:::ext
    pg[("Banco Analítico<br>PostgreSQL")]:::ext

    subgraph svc ["MS Recomendação"]
        direction TB

        subgraph entrada ["Portas de entrada"]
            grpcsvc["<b>RecomendacaoServiceServicer</b><br>gRPC :50053 · insights e assinatura"]:::comp
            http["<b>FastAPI</b> :8001<br>/health · /recomendacoes/lojas · /assinaturas"]:::comp
        end

        subgraph replicacao ["Replicação"]
            cdc["<b>KafkaCDCConsumer</b><br>Aplica mudanças de 5 tabelas<br>com handlers idempotentes"]:::comp
            rep["<b>replica.py</b><br>Versiona o schema derivado<br>e dispara rebuild"]:::comp
        end

        subgraph analise ["Análise"]
            svcRec["<b>RecommendationService</b><br>Resolve a estratégia pelo plano"]:::comp
            iStrat["<b>InsightStrategy</b>"]:::port
            gratis["<b>GratuitoInsightStrategy</b><br>nega e sugere upgrade"]:::comp
            premium["<b>PremiumInsightStrategy</b><br>concorrência geográfica,<br>preço e padrão de vendas"]:::comp
        end

        subgraph modelos ["Modelos"]
            derivado["<b>Estado derivado</b><br>RestauranteReplica · CategoriaReplica<br>ProdutoReplica · HistoricoPedido<br>VendaProdutoAnalise"]:::comp
            proprio["<b>Estado próprio</b><br>AssinaturaRestaurante<br>MetadadoReplica"]:::comp
        end
    end

    api -->|"gRPC"| grpcsvc
    kafka -->|"consome"| cdc
    cdc -->|"aplica"| derivado
    rep -->|"recria quando a versão muda"| derivado
    grpcsvc --> svcRec
    http --> svcRec
    grpcsvc -->|"grava plano"| proprio
    http -->|"grava plano"| proprio
    svcRec -->|"lê o plano"| proprio
    svcRec --> iStrat
    gratis -.->|"implementa"| iStrat
    premium -.->|"implementa"| iStrat
    premium -->|"consulta"| derivado
    derivado --> pg
    proprio --> pg
```

## Estado derivado contra estado próprio

A separação em dois grupos de modelos é a decisão de projeto mais importante deste
contêiner.

**Estado derivado** é tudo que veio do banco principal pelo CDC. Pode ser jogado
fora e reconstruído relendo o tópico desde o snapshot do Debezium. Por isso uma
mudança de schema aqui não pede migration: pede **rebuild**. O `replica.py`
guarda uma versão do schema e, ao detectar divergência, recria as tabelas
derivadas — o `group_id` do consumidor carrega essa versão, então o Kafka
reentrega tudo desde o começo.

**Estado próprio** é o que só existe aqui: o plano comercial contratado e a versão
do schema. Um rebuild não pode apagá-lo.

Antes, o plano morava em `RestauranteReplica.plano`, ou seja, dentro de uma tabela
replicada. Isso transformava uma operação rotineira — reconstruir a réplica — em
perda das assinaturas de todos os lojistas.

## Idempotência

O Debezium entrega *at-least-once*: reprocessar é comportamento normal, não
exceção. Duas escolhas garantem convergência:

- os handlers aplicam **estado completo** (o campo `after` do envelope), não
  deltas — reaplicar a mesma mensagem leva ao mesmo resultado;
- `VendaProdutoAnalise.item_pedido_id` é `unique`, e é a chave natural da origem,
  o que impede duplicar vendas num replay.

Isso não é só afirmado: `tests/test_cdc_consumer.py` reprocessa o tópico inteiro
e verifica que as contagens não mudam.

## A réplica é descartável, e o compose leva isso a sério

O banco analítico roda em `tmpfs`: some a cada `docker compose down` e é
reconstruído pelo snapshot do Debezium na subida seguinte. Persistir estado
derivado não traz benefício e cria deriva — o `prisma db push --force-reset` do
Backend Core derruba o schema da origem, e DDL não é capturado por logical
decoding, então as linhas antigas sumiriam sem gerar evento de delete e a réplica
guardaria órfãos.

Pelo mesmo motivo a publication do Postgres é criada `FOR ALL TABLES`. Com uma
lista fixa de tabelas, o `DROP TABLE` do reset as removia da publication e a task
do Debezium morria em silêncio: o CDC parava de funcionar a partir da segunda
subida do ambiente.

---
[⬅️ Índice do Nível 3](README.md) · [Nível 2: Contêineres](../c2/c4_l2_container.md)
