# 📦 Express Delivery - Real-time Microservices Simulation

Este projeto é um ecossistema de alta performance projetado para demonstrar a aplicação prática de arquiteturas modernas e escaláveis. Desenvolvido com foco em **Microserviços**, **Comunicação gRPC** e **Geoprocessamento**, o foco principal reside na implementação de padrões de resiliência e baixa latência em sistemas distribuídos.

---

## 🗺️ A arquitetura em uma tela

O sistema tem 20 contêineres, 5 linguagens e dois brokers com papéis distintos.
Três formas de olhar para ele, da mais rápida para a mais detalhada:

| Visão | Para quê |
| :--- | :--- |
| **[Planta interativa](https://arthurair3s.github.io/express-delivery-system/diagramas/planta.html)** | Clique numa peça para isolar as dependências dela, filtre por camada e leia a ficha de cada contêiner. É a versão para apresentar o projeto. |
| **[Visão geral](docs/diagramas/visao-geral.md)** | Todos os contêineres num diagrama, mais o de observabilidade em separado. |
| **[C4 — níveis 1, 2 e 3](docs/diagramas/)** | O detalhamento formal: [contexto](docs/diagramas/c1/c4_l1_context.md), [contêineres](docs/diagramas/c2/c4_l2_container.md) e [componentes por contêiner](docs/diagramas/c3/README.md). |

### O caminho de um pedido

O recorte mais útil para entender o sistema: o que acontece entre tocar em
"finalizar pedido" e a moto sair para a entrega.

```mermaid
graph LR
    classDef pessoa fill:#08427b,stroke:#052e56,color:#fff;
    classDef app fill:#438dd5,stroke:#3b7bb5,color:#fff;
    classDef dado fill:#0b132b,stroke:#00b4d8,color:#fff;
    classDef fila fill:#8a5a2b,stroke:#f8961e,color:#fff;
    classDef ext fill:#999,stroke:#777,color:#fff;

    C["👤 Cliente"]:::pessoa
    WEB["Frontend Web<br>React"]:::app
    KONG["Kong<br>JWT · rate limit"]:::app
    API["Backend Core<br>Node · GraphQL · Clean Arch"]:::app
    PG[("PostgreSQL<br>principal")]:::dado
    RMQ["RabbitMQ"]:::fila
    ENT["MS Entregadores<br>.NET · gRPC"]:::app
    ROT["MS Roteamento<br>.NET · gRPC"]:::app
    OSRM["OSRM"]:::ext
    NOT["MS Notificações<br>Python"]:::app
    KFK["Debezium → Kafka"]:::fila
    REC["MS Recomendação<br>read-model"]:::app

    C --> WEB -->|GraphQL| KONG --> API
    API --> PG
    API -->|pedido.confirmado| RMQ
    RMQ --> ENT
    ENT -->|melhor ETA| ROT --> OSRM
    ENT -->|entrega.atribuida| RMQ
    RMQ -->|pagamento.aprovado| NOT
    PG -.->|WAL| KFK -.->|CDC| REC
```

O caminho **síncrono** é a linha de cima: navegador → Kong → Backend Core →
microserviços por gRPC, com deadline e retentativa em cada chamada. O
**assíncrono** é o resto: o pedido confirmado vira evento, o MS de Entregadores
escolhe o motoboy e devolve `entrega.atribuida`; em paralelo, o Debezium lê o WAL
e alimenta a réplica analítica.

A separação dos brokers é proposital: **RabbitMQ carrega trabalho, Kafka replica
estado.**

---

## 🚀 Como Rodar o Projeto

A aplicação é totalmente conteinerizada com **Docker**. Siga os passos abaixo:

### 1. Pré-requisitos
*   Docker e Docker Compose instalado.
*   Pelo menos 8GB de RAM livre (para o servidor de roteamento OSRM).

### 2. Preparando os Dados de Mapa (OSRM)
1. **Download**: Baixe o mapa do Brasil ou apenas a região Sudeste em [Geofabrik](https://download.geofabrik.de/south-america/brazil.html) (`sudeste-latest.osm.pbf`).
2. **Compilação**: Coloque o arquivo em `./osrm-data/` e execute:
   ```bash
   docker run -t -v "${PWD}/osrm-data:/data" osrm/osrm-backend osrm-extract -p /opt/car.lua /data/seu-arquivo.osm.pbf
   docker run -t -v "${PWD}/osrm-data:/data" osrm/osrm-backend osrm-partition /data/seu-arquivo.osrm
   docker run -t -v "${PWD}/osrm-data:/data" osrm/osrm-backend osrm-customize /data/seu-arquivo.osrm
   ```
3. **Configuração**: Verifique se o nome do arquivo no `compose.yml` (`osrm-server`) condiz com o arquivo gerado (ex: `sudeste-260326.osrm`).

### 3. Execução
```bash
cp .env.example .env
docker compose up --build
```

---

## 🕹️ Manual de Voo: Guia de Simulação

1.  **Acesso**: Acesse `http://localhost:5173`. (O tráfego de API passa pelo Kong na porta 8000).
2.  **Login**: Registre-se e faça login como cliente para visualizar a página de rastreamento de entregas.
3.  **App do Entregador**: Acesse o painel dedicado do entregador na interface web. A partir dele você pode:
    *   Ficar online/offline para atualizar o radar de ofertas.
    *   Visualizar ofertas de corridas pendentes na região geográfica.
    *   Aceitar corridas, visualizar o trajeto e acompanhar a posição em tempo real em um mini-mapa com ícone de moto.
    *   Simular o deslocamento de forma autônoma pelo GPS (OSRM) ou realizar **overrides manuais** clicando nos botões de preset ou arrastando o marcador de localização no mapa.
4.  **Ações Rápidas**: Ao realizar um override manual (arrastando o pino ou teletransportando-se), qualquer simulação autônoma ativa para a entrega em questão é interrompida no backend para respeitar a posição selecionada por você.

> [!CAUTION]
> **Persistência de dados**: o serviço `api` roda `prisma db push --force-reset` a
> cada subida, então o banco principal sempre começa limpo e semeado. O banco
> analítico acompanha: ele roda em `tmpfs` e é reconstruído pelo snapshot do
> Debezium, porque é estado derivado e persistir isso só geraria deriva.

---

## 🛠️ Stack Tecnológica

| Componente | Tecnologia | Papel |
| :--- | :--- | :--- |
| **Frontend** | React, Leaflet | UI moderna e visualização de geoprocessamento com marcadores personalizados (cliente, restaurante e moto) |
| **Gateway** | Kong 3.4 (DB-less, declarativo) | Porta de entrada: validação de JWT, CORS, rate limit, correlation-id e limite de payload |
| **API Principal** | Node.js (TypeScript), Apollo Server (GraphQL) | Orquestração de Microserviços e Schema unificado sob Clean Architecture |
| **Microserviços C#** | .NET 10, gRPC, EF Core | Performance extrema para gerenciamento de entregadores e roteamento |
| **Microserviços Python** | Python 3.12, FastAPI, gRPC, Pika, urllib | Motores de recomendação de precificação B2B e envio de notificações resilientes via Mailtrap HTTP/SMTP |
| **Bancos de Dados** | PostgreSQL 15, Redis 7 (Redis Geo) | Persistência física isolada por domínio e cache/localização ultra-rápida |
| **Roteamento** | OSRM Engine (C++ Engine) | Inteligência logística baseada em OpenStreetMap |
| **Mensageria** | RabbitMQ (AMQP) | Transporte de trabalho: atribuição de entregas e notificações, com DLQ por fila |
| **Change Data Capture** | Apache Kafka (KRaft), Debezium 2.4 | Replicação de estado: o WAL do banco principal alimenta a réplica analítica do motor B2B |
| **Observabilidade** | OpenTelemetry, Jaeger | Tracing distribuído ponta a ponta, correlacionando GraphQL, gRPC e fila |
| **Métricas** | Prometheus, Grafana | Os quatro serviços expõem `/metrics`; o Grafana sobe com datasources e um dashboard de dez painéis já provisionados |

---

## 🌟 O que o sistema faz

Uma SPA única atende os três perfis; o painel renderizado vem da claim `role` do
JWT.

**Cliente**
*   Vitrine de restaurantes, cardápio e carrinho, com endereço editável.
*   Checkout com três métodos de pagamento (Pix, cartão com limite e Stripe),
    selecionados em tempo de execução por *Strategy*.
*   Rastreamento da entrega em tempo real, com a moto se movendo no mapa.
*   Histórico dos próprios pedidos.

**Lojista**
*   Painel de pedidos: aceitar ou recusar o que chega, e acompanhar o preparo.
*   Gestão de cardápio: categorias e produtos.
*   **Insights B2B de precificação**: comparação com concorrentes num raio
    geográfico, cruzada com o histórico real de vendas.
*   Assinatura comercial: o plano (Gratuito ou Premium) decide o que a análise
    devolve.

**Entregador**
*   Ficar online/offline, o que liga e desliga o radar de ofertas.
*   Radar de corridas próximas, por raio geográfico sobre o Redis GEO.
*   Aceitar corrida e ver o trajeto calculado pelo OSRM.
*   Simular o deslocamento de forma autônoma pelo GPS **ou** assumir o controle
    manualmente — arrastando o marcador ou usando presets. O override cancela a
    simulação autônoma em curso, para o backend respeitar a posição escolhida.

---

## 🏗️ Como foi construído

### Arquitetura e organização
*   **Clean Architecture com inversão de dependência**: Presentation (resolvers
    GraphQL), Application (casos de uso atômicos), Domain (entidades, Value
    Objects e portas) e Infrastructure. A infraestrutura aponta para o domínio,
    nunca o contrário — e a suíte de testes prova isso, exercitando casos de uso
    com dublês de todas as portas, sem Docker.
*   **Isolamento físico de bancos**: PostgreSQL dedicado para o núcleo, para
    entregadores e para o read-model analítico. Nenhum serviço lê o banco do
    outro; para saber algo sobre a frota, o Backend Core faz gRPC.
*   **Strategy para regras que variam**: métodos de pagamento e níveis de plano
    comercial.
*   **Cache como decorator de repositório**: o cache-aside do Redis vive num
    `CachedRestauranteRepository` que implementa a mesma porta do repositório
    real e é composto no container de DI. Resolvers e casos de uso não sabem que
    existe cache, e a invalidação fica no ponto por onde toda escrita passa.

### Segurança
*   **Autorização declarativa no schema**: uma diretiva `@auth(roles: [...])`,
    aplicada por transformação de schema, embrulha o resolver de cada campo
    protegido. O que é público — catálogo, login, registro — é público por
    ausência explícita da diretiva, legível direto no SDL. Argumentos de
    identidade (`usuario_id`, `entregador_id`) foram **removidos do contrato**:
    o dono de cada recurso vem do token, então forjar identidade deixou de ser
    expressável.
*   **Projeção mínima nas relações do grafo**: autorização por campo não enxerga
    a travessia. Um lojista legítimo, indo por `pedidosPorRestaurante → usuario`,
    alcançava e-mail, telefone e coordenadas de casa do cliente — e, por
    `Usuario.pedidos`, o histórico dele na concorrência. As relações aninhadas
    passaram a devolver um `UsuarioPublico` com apenas `id`, `nome` e `endereco`;
    a conta completa só é acessível pelo próprio dono, via `me`.

### Comunicação assíncrona
*   **RabbitMQ carrega trabalho**: atribuição de entregas e notificações, guiadas
    por `pedido.confirmado`, `entrega.atribuida`, `pagamento.aprovado` e
    `pedido.entregue`. Cada fila tem **DLQ dedicada**, isolada por
    `x-dead-letter-routing-key` numa DLX compartilhada — uma mensagem que falha
    fica retida para inspeção em vez de ser descartada.
*   **Kafka replica estado, via CDC**: a réplica analítica do `ms-recomendacao` é
    derivada do WAL do PostgreSQL pelo Debezium, não publicada pela aplicação.
    Isso elimina o *dual write* — o evento nasce de uma transação já commitada —
    e captura **toda** escrita, inclusive seed e SQL manual, que nunca passariam
    pelos resolvers. O Kafka roda em modo **KRaft**, sem Zookeeper.
*   **Read-model reconstruível**: tudo no banco de recomendação pode ser refeito
    relendo o tópico desde o snapshot. Por isso uma mudança de schema ali não
    pede migration, pede *rebuild*. O estado **próprio** do serviço (assinaturas
    comerciais) mora fora do conjunto replicado, justamente para sobreviver a
    isso.
*   **Idempotência no consumo**: o Debezium entrega *at-least-once*, então
    reprocessar é normal, não excepcional. Os handlers aplicam estado completo
    (`after`) em vez de deltas, e `vendas_produtos_analise.item_pedido_id` é
    `unique` — a chave natural da origem. Verificado resetando os offsets e
    reprocessando o tópico inteiro: contagens idênticas.

### Resiliência
*   **Deadline e retentativa em toda chamada de saída**: cada cliente gRPC aplica
    deadline por chamada (5s, 8s para roteamento) através de um proxy que
    distingue métodos unários de streams pelos metadados do `grpc-js`, mais
    retentativa com backoff exponencial apenas em `UNAVAILABLE`. O `HttpClient`
    do OSRM tem timeout de 6s, **abaixo** do deadline de quem o chama — o mais
    curto precisa ficar mais fundo na pilha.

### Observabilidade
*   **Tracing distribuído**: OpenTelemetry nas três stacks, exportando para o
    Jaeger. Um trace correlaciona a requisição GraphQL com as chamadas gRPC, o
    processamento de fila e as consultas ao banco que ela dispara.
*   **Métricas de negócio, não só técnicas**: além de latência e volume vindos da
    instrumentação automática, contadores que respondem perguntas operacionais —
    pedidos criados, pagamentos por método e resultado, entregas atribuídas,
    mensagens descartadas para a DLQ e eventos de CDC aplicados por tabela. Um
    pico de erro aparece na latência; "nenhum pedido está sendo atribuído há dez
    minutos" só aparece com isso.

---

## 📨 Topologia de Mensageria

Um único exchange `topic` (`delivery-events`) e uma Dead Letter Exchange
compartilhada (`delivery-events.dlx`). Cada fila tem a **sua** DLQ, isolada por
`x-dead-letter-routing-key` — sem isso, uma DLQ ligada em `#` receberia os
descartes de todos os serviços.

| Fila | Serviço | Routing keys | DLQ |
| :--- | :--- | :--- | :--- |
| `entregas.pedido-confirmado` | ms-entregadores (C#) | `pedido.confirmado` | `entregas.pedido-confirmado.dlq` |
| `api.entrega-atribuida` | api-node (TS) | `entrega.atribuida` | `api.entrega-atribuida.dlq` |
| `notificacoes.eventos` | ms-notificacoes (Py) | `pagamento.aprovado`, `pedido.entregue` | `notificacoes.eventos.dlq` |

Todos os consumidores usam `ack` manual e rejeitam com `requeue=false`, de modo
que a falha vai para a DLQ em vez de entrar em loop de reentrega.

O `ms-recomendacao` **não** aparece aqui de propósito: ele não recebe trabalho,
só replica dados, e por isso consome exclusivamente do Kafka.

> **Limitação conhecida:** estes eventos de trabalho são publicados depois do
> commit, sem Outbox, e os consumidores de RabbitMQ ainda não verificam se já
> processaram a mensagem.

### Pipeline de CDC

```
PostgreSQL (WAL, wal_level=logical)
  └─ Debezium 2.4  →  Kafka (KRaft)  →  ms-recomendacao
       publication: delivery_catalogo_pub    tópicos: dbserver1.public.<tabela>
       slot:        delivery_catalogo_slot   tabelas: restaurantes, categorias,
                                                      produtos, pedidos, itens_pedido
```

O connector é registrado automaticamente pelo serviço `debezium-connector-init`
no boot — a configuração está versionada em [`debezium/`](debezium/), e não
depende mais de um POST manual na API do Kafka Connect.

---

## 🧪 Testes

```bash
./run-tests.sh
```

**117 testes**, nenhum deles precisa de Docker, banco ou broker:

| Suíte | Testes | Ferramenta | Cobre |
| :--- | ---: | :--- | :--- |
| `api-node/tests` | 71 | Vitest | Value Objects, máquinas de estado, `AtribuirMelhorEntregadorUseCase`, decorator de cache, diretiva `@auth` |
| `ms-tests-cs` | 18 | xUnit + NSubstitute | Mapeamento entidade ↔ contrato gRPC, lógica de roteamento |
| `ms-recomendacao-py/tests` | 22 | pytest | Handlers de CDC, idempotência e replay, resolução de plano |
| `ms-notificacoes-py/tests` | 6 | pytest | Renderização dos e-mails transacionais |

Nenhuma suíte sobe contêiner: os testes de CDC usam SQLite em memória e os de
caso de uso usam dublês das portas. A suíte inteira roda em segundos, que é a
condição para alguém de fato executá-la.

**Escrever a suíte revelou três problemas reais**, todos hoje com teste de
regressão. Um de exposição de dados:

1. O grafo GraphQL expunha mais que qualquer tela consumia. Autorização por campo
   não bloqueia travessia: bastava partir de um campo liberado para chegar à PII
   do cliente e ao histórico dele na concorrência. Resolvido com um tipo de
   projeção nas relações, sem tocar no frontend — ele já pedia só `nome` e
   `endereco`.

E dois bugs de implementação:

2. `DomainError` fixava `DomainError.prototype` no construtor, o que descartava o
   protótipo de toda subclasse. `erro instanceof PedidoInvalidoError` devolvia
   `false` nas 18 subclasses do sistema — e era por isso que o tratamento de erro
   do GraphQL comparava sufixo de nome em vez de usar `instanceof`.

3. O mapper do MS de Entregadores usava `Enum.TryParse` para converter o status
   do banco no enum do contrato gRPC. Como o gerador de protobuf transforma
   `EM_ENTREGA` em `EmEntrega`, o parse falhava e caía no fallback: **um
   entregador ocupado era reportado como offline**.

---

## 📡 Endpoints de Acesso (Via Gateway)
*   **Aplicação Web (Frontend)**: [http://localhost:5173](http://localhost:5173)
*   **GraphQL Playground (via Kong)**: [http://localhost:8000/graphql](http://localhost:8000/graphql)
*   **OSRM (Direto)**: [http://localhost:5080](http://localhost:5080)
*   **Jaeger Tracing Dashboard**: [http://localhost:16686](http://localhost:16686)
*   **Grafana**: [http://localhost:3000](http://localhost:3000) — dashboard *Express Delivery — Visão Operacional*, provisionado
*   **RabbitMQ Management**: [http://localhost:15672](http://localhost:15672)
*   **Kafka UI (tópicos e connectors)**: [http://localhost:8080](http://localhost:8080)
*   **Kafka Connect (API do Debezium)**: [http://localhost:8084/connectors](http://localhost:8084/connectors)

---

## 🚧 Status e Visão de Futuro (Roadmap)

Este projeto funciona como um **laboratório vivo de arquitetura de software**, mantendo sua base de código alinhada às melhores práticas do mercado.

### Próximas evoluções planejadas
*   **Integração contínua**: as quatro suítes existem e rodam com um comando, mas **ainda não há pipeline**. A decisão foi consciente: primeiro construir testes que valem a pena executar, depois automatizá-los. O próximo passo é um workflow do GitHub Actions com três jobs em paralelo — `setup-node` para o Vitest, `setup-dotnet` para o xUnit e `setup-python` para os dois pytest —, disparado em push e pull request, com badge no topo deste README. Nada disso exige serviço de apoio, já que nenhuma suíte precisa de banco ou broker.
*   **Ampliar a cobertura**: as suítes atuais focam em domínio e casos de uso. Faltam os adaptadores Prisma e os resolvers de ponta a ponta, que exigiriam banco efêmero via Testcontainers.
*   **Outbox no fluxo de pedido**: a replicação de dados já não tem dual write, mas os eventos de trabalho do RabbitMQ têm. Um pedido confirmado sem entregador atribuído é falha visível — é o próximo alvo.
*   **Circuit breaker no OSRM**: hoje há deadline e retry; falta o disjuntor. O ponto natural é o `OsrmProvider`, com Polly, por ser a única dependência externa com falha recorrente.
*   **Paginação e DataLoader**: nenhuma query de lista é paginada, e os resolvers de campo (`Avaliacao.usuario`, `Pedido.itens`) fazem N+1.
*   **Migrations versionadas**: o `compose.yml` usa `prisma db push --force-reset`, o que é adequado para uma demo reproduzível, mas não deixa histórico de schema.

---

## ⚖️ Trade-offs assumidos

Nem toda limitação aqui é descuido — várias são decisões conscientes, com o custo
pesado contra o benefício. As que mais importam:

**Change Data Capture para replicar estado, RabbitMQ para carregar trabalho.**
A réplica analítica é derivada do WAL do PostgreSQL, não publicada pela aplicação.
Isso elimina o *dual write* e captura escritas que nunca passariam pelos resolvers
— o `seed.js` é uma delas. Custa três contêineres; o modo KRaft dispensa o
Zookeeper. Em contrapartida, o ambiente completo não cabe no plano gratuito de um
PaaS: em deploy restrito o `ms-recomendacao` fica de fora, o que é preferível a
servir recomendação sobre dado inventado.

**O CDC foi removido em 07/2026 e retomado em 09/2026.** A remoção foi expediente
para caber num plano gratuito, não decisão de design — e cobrou caro: sem eventos
do seed, a réplica nascia vazia, e o serviço passou a manter uma cópia manual do
catálogo e a fabricar vendas com `random` para alimentar os insights. As duas
gambiarras foram removidas junto com a retomada.

**Eventos de trabalho ainda são publicados após o commit, sem Outbox.** A
replicação de dados já não tem *dual write*, mas `pedido.confirmado`,
`pagamento.aprovado` e `pedido.entregue` sim: se o processo cair entre o commit e
o publish, o evento se perde. Um Outbox correto exigiria tabela transacional,
processo relay e deduplicação; para o perfil deste sistema o custo não se paga
ainda. É a próxima dívida da lista.

**Autorização mora no schema, não no gateway.** O Kong valida assinatura e
expiração de quem apresenta token, mas repassa requisições anônimas — quem decide
o que é público é a diretiva `@auth`. O `api-node` reverifica o token por conta
própria, então continua seguro mesmo exposto diretamente.

**JWT em `localStorage`, com risco de XSS aceito.** Migrar para cookie `httpOnly`
puxaria CORS com credenciais, token anti-CSRF e um domínio próprio com TLS —
inviável num ambiente de demonstração. A mitigação real é o backend não confiar no
cliente para nada de identidade: um token roubado dá acesso àquele usuário, não
escalada de privilégio.

**Kong é o único gateway.** O projeto chegou a ter dois simultâneos: o Kong nos
composes e um gateway Express criado num dia de deploy conturbado, que nunca
chegou aos arquivos de compose. A duplicação foi resolvida em favor do que os
composes de fato executam.

---
*Este projeto demonstra o compromisso com a excelência técnica e a paixão por arquiteturas de software complexas.*
