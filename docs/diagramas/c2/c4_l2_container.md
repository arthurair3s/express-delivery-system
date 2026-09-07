# C4 — Nível 2: Contêineres

Zoom dentro do Express Delivery: as unidades executáveis, os bancos, os brokers e
a stack de observabilidade. Cada caixa aqui é algo que sobe no `compose.yml`.

> **Escopo:** o sistema Express Delivery · **Público:** quem vai desenvolver, operar ou avaliar a arquitetura

As portas indicadas são as **internas da rede Docker** — é por elas que os
contêineres conversam entre si. As portas publicadas no host estão no
[README](../../../README.md#-endpoints-de-acesso-via-gateway).

```mermaid
graph TB
    classDef person fill:#08427b,stroke:#052e56,stroke-width:2px,color:#fff;
    classDef container fill:#438dd5,stroke:#3b7bb5,stroke-width:2px,color:#fff;
    classDef db fill:#0b132b,stroke:#00b4d8,stroke-width:2px,color:#fff;
    classDef broker fill:#8a5a2b,stroke:#f8961e,stroke-width:2px,color:#fff;
    classDef ext fill:#999999,stroke:#777777,stroke-width:2px,color:#fff;
    classDef obs fill:#5c5c5c,stroke:#ff5722,stroke-width:2px,color:#fff;

    cliente["<b>Cliente</b><br><i>[Pessoa]</i>"]:::person
    lojista["<b>Lojista</b><br><i>[Pessoa]</i>"]:::person
    entregador["<b>Entregador</b><br><i>[Pessoa]</i>"]:::person

    subgraph sistema ["Express Delivery"]
        direction TB

        web["<b>Frontend Web</b><br><i>[React 19 + Vite]</i><br>SPA única com as telas de<br>cliente, lojista e entregador"]:::container
        kong["<b>API Gateway</b><br><i>[Kong 3.4 DB-less]</i><br>Valida JWT, CORS, rate limit,<br>correlation-id · :8000"]:::container

        api["<b>Backend Core</b><br><i>[Node.js · TypeScript · Apollo GraphQL · Prisma]</i><br>Schema GraphQL único, autorização,<br>casos de uso e orquestração gRPC · :4000"]:::container

        msent["<b>MS Entregadores</b><br><i>[.NET 10 · gRPC · EF Core]</i><br>Ciclo de vida da frota e<br>rastreamento geográfico · :5001"]:::container
        msrot["<b>MS Roteamento</b><br><i>[.NET 10 · gRPC]</i><br>Rotas, distâncias e ETA · :5002"]:::container
        msrec["<b>MS Recomendação</b><br><i>[Python · FastAPI · gRPC · SQLAlchemy]</i><br>Read-model analítico e insights<br>de precificação B2B · gRPC :50053 · HTTP :8001"]:::container
        msnot["<b>MS Notificações</b><br><i>[Python · pika]</i><br>Envia e-mail transacional<br>a partir de eventos"]:::container

        pgmain[("<b>Banco Principal</b><br><i>[PostgreSQL 15]</i><br>Usuários, lojas, pedidos,<br>pagamentos · :5432")]:::db
        pgent[("<b>Banco Entregadores</b><br><i>[PostgreSQL 15]</i><br>Cadastro da frota · :5432")]:::db
        pgrec[("<b>Banco Analítico</b><br><i>[PostgreSQL 15]</i><br>Réplicas derivadas + assinaturas · :5432")]:::db
        redis[("<b>Redis</b><br><i>[Redis 7]</i><br>Posições geográficas (GEO)<br>e cache-aside · :6379")]:::db

        rabbit["<b>RabbitMQ</b><br><i>[RabbitMQ 3]</i><br>Transporte de trabalho:<br>exchange + DLX · :5672"]:::broker
        kafka["<b>Kafka</b><br><i>[Confluent 7.6 · KRaft]</i><br>Replicação de estado:<br>tópicos dbserver1.public.* · :9092"]:::broker
        debezium["<b>Debezium Connect</b><br><i>[Debezium 2.4]</i><br>Lê o WAL e publica no Kafka · :8083"]:::broker

        osrm["<b>OSRM</b><br><i>[Motor C++ auto-hospedado]</i><br>Cálculo geométrico de rotas · :5000"]:::container
    end

    subgraph obs ["Observabilidade"]
        direction LR
        jaeger["<b>Jaeger</b><br><i>[All-in-One]</i><br>Traces distribuídos"]:::obs
        prom["<b>Prometheus</b><br>raspa /metrics dos<br>quatro serviços"]:::obs
        graf["<b>Grafana</b><br>Painéis"]:::obs
    end

    subgraph ext ["Sistemas Externos"]
        direction LR
        stripe["<b>Stripe</b><br><i>[Sistema Externo]</i>"]:::ext
        mailtrap["<b>Mailtrap</b><br><i>[Sistema Externo]</i>"]:::ext
    end

    cliente --> web
    lojista --> web
    entregador --> web
    web -->|"GraphQL<br>[HTTPS/JSON]"| kong
    kong -->|"Encaminha /graphql<br>[HTTP]"| api

    api -->|"Lê e grava<br>[Prisma/TCP]"| pgmain
    api -->|"Cache-aside<br>[ioredis]"| redis
    api -->|"Frota e posições<br>[gRPC]"| msent
    api -->|"Rotas e ETA<br>[gRPC]"| msrot
    api -->|"Insights e assinatura<br>[gRPC]"| msrec
    api -->|"Publica eventos de trabalho<br>[AMQP]"| rabbit
    api -->|"Cobra pedidos<br>[HTTPS/REST]"| stripe

    msent -->|"Persiste frota<br>[EF Core]"| pgent
    msent -->|"Posições GEO<br>[Redis GEO]"| redis
    msent -->|"Consome pedido.confirmado<br>publica entrega.atribuida<br>[AMQP]"| rabbit
    msrot -->|"Consulta trajetos<br>[HTTP/JSON]"| osrm
    msnot -->|"Consome pagamento.aprovado<br>e pedido.entregue [AMQP]"| rabbit
    msnot -->|"Dispara e-mails<br>[HTTPS/REST ou SMTP]"| mailtrap

    pgmain -.->|"WAL / logical decoding"| debezium
    debezium -.->|"Publica mudanças"| kafka
    kafka -.->|"Consome tópicos<br>[Kafka Protocol]"| msrec
    msrec -->|"Aplica réplicas<br>[SQLAlchemy]"| pgrec

    api -. "OTLP" .-> jaeger
    msent -. "OTLP" .-> jaeger
    msrot -. "OTLP" .-> jaeger
    msrec -. "OTLP" .-> jaeger
    msnot -. "OTLP" .-> jaeger
    prom -. "scrape /metrics" .-> api
    graf --> prom
    graf --> jaeger
```

## Como ler este diagrama

| Traço | Significado |
| :--- | :--- |
| Linha cheia | Chamada síncrona: quem chama espera a resposta |
| Linha tracejada | Fluxo assíncrono ou telemetria: quem emite não espera |

| Cor | Tipo |
| :--- | :--- |
| Azul escuro | Pessoa |
| Azul | Contêiner (aplicação executável) |
| Azul petróleo | Armazenamento de dados |
| Marrom | Broker de mensageria |
| Cinza | Sistema externo |
| Grafite | Observabilidade |

## Os dois brokers

Não é redundância — cada um resolve um problema diferente:

- **RabbitMQ carrega trabalho.** `pedido.confirmado` leva à atribuição de um
  entregador; `pagamento.aprovado` dispara um e-mail. São tarefas com consumidor
  único e DLQ por fila.
- **Kafka replica estado.** O `ms-recomendacao` não recebe trabalho: ele mantém
  uma cópia analítica do banco principal, derivada do WAL pelo Debezium. Por isso
  ele **não** consome RabbitMQ — o que entra nele é fluxo de dados, com replay e
  ordenação.

## Onde o OSRM aparece

No [Nível 1](../c1/c4_l1_context.md) ele é um sistema externo, porque é um motor
de terceiros. Aqui ele é um contêiner, porque o projeto o auto-hospeda a partir de
um extrato do OpenStreetMap. As duas leituras estão certas em níveis diferentes.

---
[⬅️ Nível 1: Contexto](../c1/c4_l1_context.md) · [README](../../../README.md) · [Nível 3: Componentes ➡️](../c3/README.md)
