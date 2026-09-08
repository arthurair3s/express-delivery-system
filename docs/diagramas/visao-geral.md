# Visão Geral da Arquitetura

Todo o sistema em uma tela. Não é um nível do C4 — é um *system landscape*, feito
para apresentar o projeto e para servir de mapa antes de entrar nos níveis
[C1](c1/c4_l1_context.md), [C2](c2/c4_l2_container.md) e [C3](c3/README.md).

> **Versão interativa:** [Planta do Express Delivery](https://arthurair3s.github.io/express-delivery-system/diagramas/planta.html)
> — clique numa peça para isolar as dependências dela, filtre por camada
> (síncrono, trabalho, replicação, observabilidade) e leia a ficha de cada
> contêiner. É a versão feita para apresentar o projeto.

```mermaid
graph LR
    classDef pessoa fill:#08427b,stroke:#052e56,color:#fff;
    classDef borda fill:#6a4c93,stroke:#4a3568,color:#fff;
    classDef app fill:#438dd5,stroke:#3b7bb5,color:#fff;
    classDef dado fill:#0b132b,stroke:#00b4d8,color:#fff;
    classDef fila fill:#8a5a2b,stroke:#f8961e,color:#fff;
    classDef obs fill:#5c5c5c,stroke:#ff5722,color:#fff;
    classDef ext fill:#999,stroke:#777,color:#fff;

    subgraph U ["👤 Usuários"]
        direction TB
        C["Cliente"]:::pessoa
        L["Lojista"]:::pessoa
        E["Entregador"]:::pessoa
    end

    subgraph B ["🌐 Borda"]
        direction TB
        WEB["Frontend Web<br>React · Vite"]:::borda
        KONG["Kong<br>JWT · rate limit · CORS"]:::borda
    end

    subgraph A ["⚙️ Aplicação"]
        direction TB
        API["Backend Core<br>Node · GraphQL · Clean Arch"]:::app
        ENT["MS Entregadores<br>.NET · gRPC"]:::app
        ROT["MS Roteamento<br>.NET · gRPC"]:::app
        REC["MS Recomendação<br>Python · read-model"]:::app
        NOT["MS Notificações<br>Python"]:::app
    end

    subgraph M ["📨 Mensageria"]
        direction TB
        RMQ["RabbitMQ<br><i>carrega trabalho</i><br>DLQ por fila"]:::fila
        DBZ["Debezium"]:::fila
        KFK["Kafka KRaft<br><i>replica estado</i>"]:::fila
    end

    subgraph D ["🗄️ Dados"]
        direction TB
        PG1[("Principal<br>PostgreSQL")]:::dado
        PG2[("Entregadores<br>PostgreSQL")]:::dado
        PG3[("Analítico<br>PostgreSQL")]:::dado
        RDS[("Redis<br>GEO + cache")]:::dado
    end

    subgraph X ["🔌 Externos"]
        direction TB
        OSRM["OSRM"]:::ext
        STR["Stripe"]:::ext
        MTP["Mailtrap"]:::ext
    end

    subgraph O ["📊 Observabilidade"]
        direction TB
        JGR["Jaeger"]:::obs
        PRM["Prometheus"]:::obs
        GRF["Grafana"]:::obs
    end

    C --> WEB
    L --> WEB
    E --> WEB
    WEB --> KONG --> API

    API -->|gRPC| ENT
    API -->|gRPC| ROT
    API -->|gRPC| REC
    API --> PG1
    API --> RDS
    API -->|publica| RMQ
    API --> STR

    ENT --> PG2
    ENT --> RDS
    ENT <-->|consome e publica| RMQ
    ROT --> OSRM
    NOT -->|consome| RMQ
    NOT --> MTP

    PG1 -.->|WAL| DBZ -.-> KFK -.->|CDC| REC
    REC --> PG3

    API -.-> JGR
    ENT -.-> JGR
    ROT -.-> JGR
    REC -.-> JGR
    NOT -.-> JGR
    PRM -.-> API
    GRF --> PRM
    GRF --> JGR
```

## Os dois caminhos que valem entender

**Síncrono, da esquerda para a direita.** O navegador fala GraphQL com o Kong, que
valida o token e encaminha ao Backend Core. Ele orquestra os microserviços por
gRPC — com deadline e retentativa em cada chamada — e responde.

**Assíncrono, por baixo.** Um pedido confirmado vira evento no RabbitMQ, o MS de
Entregadores escolhe o motoboy e devolve `entrega.atribuida`. Em paralelo, o
Debezium lê o WAL do banco principal e alimenta o Kafka, de onde o MS de
Recomendação reconstrói sua réplica analítica.

A separação é proposital: **RabbitMQ carrega trabalho, Kafka replica estado.**

---
[⬅️ README](../../README.md) · [C1](c1/c4_l1_context.md) · [C2](c2/c4_l2_container.md) · [C3](c3/README.md)
