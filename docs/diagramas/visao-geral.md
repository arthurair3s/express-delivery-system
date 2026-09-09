# Visão Geral da Arquitetura

Todo o sistema em uma tela. Não é um nível do C4 — é um *system landscape*, feito
para apresentar o projeto e para servir de mapa antes de entrar nos níveis
[C1](c1/c4_l1_context.md), [C2](c2/c4_l2_container.md) e [C3](c3/README.md).

> **Versão interativa:** [Planta do Express Delivery](https://arthurair3s.github.io/express-delivery-system/diagramas/planta.html)
> — clique numa peça para isolar as dependências dela, filtre por camada
> (síncrono, trabalho, replicação, observabilidade) e leia a ficha de cada
> contêiner. É a versão feita para apresentar o projeto.

## O sistema, sem a observabilidade

Os contêineres que atendem uma requisição e movem um pedido. A telemetria sai
daqui de propósito: ela toca **todos** os serviços, e desenhá-la junto cruzava o
diagrama inteiro com arestas que não ajudam a entender o fluxo. Ela tem o próprio
diagrama, logo abaixo.

O agrupamento é por **cor**, não por caixa — subgraphs forçavam o Mermaid a
empilhar peças que conversam em todas as direções, e o resultado era ilegível.

```mermaid
graph LR
    classDef pessoa fill:#08427b,stroke:#052e56,color:#fff;
    classDef borda fill:#6a4c93,stroke:#4a3568,color:#fff;
    classDef app fill:#438dd5,stroke:#3b7bb5,color:#fff;
    classDef dado fill:#0b132b,stroke:#00b4d8,color:#fff;
    classDef fila fill:#8a5a2b,stroke:#f8961e,color:#fff;
    classDef ext fill:#999,stroke:#777,color:#fff;

    U["👤 Cliente · Lojista<br>Entregador"]:::pessoa
    WEB["Frontend Web<br>React · Vite"]:::borda
    KONG["Kong<br>JWT · rate limit · CORS"]:::borda
    API["Backend Core<br>Node · GraphQL · Clean Arch"]:::app
    ENT["MS Entregadores<br>.NET · gRPC"]:::app
    ROT["MS Roteamento<br>.NET · gRPC"]:::app
    REC["MS Recomendação<br>Python · read-model"]:::app
    NOT["MS Notificações<br>Python"]:::app
    PG1[("Principal<br>PostgreSQL")]:::dado
    PG2[("Entregadores<br>PostgreSQL")]:::dado
    PG3[("Analítico<br>PostgreSQL")]:::dado
    RDS[("Redis<br>GEO + cache")]:::dado
    RMQ["RabbitMQ<br><i>carrega trabalho</i>"]:::fila
    DBZ["Debezium"]:::fila
    KFK["Kafka KRaft<br><i>replica estado</i>"]:::fila
    OSRM["OSRM"]:::ext
    STR["Stripe"]:::ext
    MTP["Mailtrap"]:::ext

    U --> WEB --> KONG --> API
    API -->|gRPC| ENT
    API -->|gRPC| ROT
    API -->|gRPC| REC
    API --> PG1
    API --> RDS
    API --> STR
    API -->|publica| RMQ
    ENT --> PG2
    ENT --> RDS
    ENT <-->|consome e publica| RMQ
    ROT --> OSRM
    NOT -->|consome| RMQ
    NOT --> MTP
    REC --> PG3
    PG1 -.->|WAL| DBZ -.-> KFK -.->|CDC| REC
```

**Legenda das cores:** azul-escuro = pessoas · roxo = borda · azul = aplicação ·
preto = dados · marrom = mensageria · cinza = sistemas externos.

## A observabilidade, em separado

Um padrão em duas direções que costuma se perder quando desenhado junto com o
resto: **cada serviço empurra traces, o Prometheus puxa métricas.**

Os quatro serviços instrumentados aparecem numa caixa só porque têm exatamente a
mesma relação com as duas pontas — repetir oito arestas idênticas não
acrescentaria informação.

```mermaid
graph LR
    classDef app fill:#438dd5,stroke:#3b7bb5,color:#fff;
    classDef off fill:#2b2b2b,stroke:#777,color:#bbb,stroke-dasharray:4 3;
    classDef obs fill:#5c5c5c,stroke:#ff5722,color:#fff;

    SVC["Backend Core · MS Entregadores<br>MS Roteamento · MS Recomendação"]:::app
    NOT["MS Notificações<br><i>sem instrumentação</i>"]:::off
    JGR["Jaeger<br>traces"]:::obs
    PRM["Prometheus<br>métricas"]:::obs
    GRF["Grafana<br>painéis"]:::obs

    SVC -->|"OTLP (push)"| JGR
    PRM -.->|"raspa /metrics (pull)"| SVC
    GRF --> PRM
    GRF --> JGR
```

O `ms-notificacoes` está solto no diagrama porque está solto no sistema: é o
único serviço sem instrumentação — não expõe `/metrics` nem exporta traces, por
ser apenas um consumidor de fila, sem servidor HTTP. É uma lacuna conhecida, não
uma simplificação do desenho.

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
