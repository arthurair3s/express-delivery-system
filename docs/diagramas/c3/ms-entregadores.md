# C3 — MS Entregadores

> **Contêiner aberto:** MS Entregadores · **Stack:** .NET 10 · gRPC · EF Core · StackExchange.Redis

Dono do cadastro da frota e da posição geográfica de cada entregador. É o único
serviço que decide qual entregador recebe um pedido.

```mermaid
graph TB
    classDef comp fill:#85bbf0,stroke:#6699cc,stroke-width:2px,color:#000;
    classDef port fill:#e9c46a,stroke:#f4a261,stroke-width:2px,color:#000;
    classDef ext fill:#999999,stroke:#777777,stroke-width:2px,color:#fff;

    api["Backend Core"]:::ext
    rabbit["RabbitMQ"]:::ext
    pg[("Banco Entregadores<br>PostgreSQL")]:::ext
    redis[("Redis")]:::ext

    subgraph svc ["MS Entregadores"]
        direction TB
        grpcsvc["<b>EntregadorService</b><br>Serviço gRPC · 8 operações<br>cadastro, status, busca por raio<br>e stream de localização"]:::comp
        consumer["<b>PedidoConfirmadoConsumer</b><br>BackgroundService · fila<br>entregas.pedido-confirmado"]:::comp

        iRepo["<b>IEntregadorRepository</b>"]:::port
        iGeo["<b>ILocalizacaoRedisService</b>"]:::port

        repo["<b>EntregadorRepository</b><br>EF Core"]:::comp
        geo["<b>LocalizacaoRedisService</b><br>comandos GEO"]:::comp
        mapper["<b>EntregadorMapper</b><br>entidade ↔ contrato gRPC"]:::comp
        ctx["<b>AppDbContext</b>"]:::comp
        ent["<b>Entregador</b><br>modelo EF"]:::comp
    end

    api -->|"gRPC"| grpcsvc
    rabbit -->|"pedido.confirmado"| consumer
    consumer -->|"publica entrega.atribuida"| rabbit

    grpcsvc --> iRepo
    grpcsvc --> iGeo
    grpcsvc --> mapper
    consumer --> iRepo
    consumer --> iGeo

    repo -.->|"implementa"| iRepo
    geo -.->|"implementa"| iGeo
    repo --> ctx
    ctx --> ent
    ctx --> pg
    geo --> redis
```

## Observações de projeto

**`EntregadorService` concentra oito operações gRPC.** É a implementação da
classe base gerada pelo `.proto`, então cada método é um `override` que delega ao
repositório. Separar exigiria uma camada de mediação só para redistribuir
delegação — o ganho não paga o custo. O único método com lógica real é
`BuscarProximos`, que cruza o raio geográfico do Redis com o status no banco.

**`Entregador` é um modelo anêmico.** Cinco propriedades, nenhum comportamento.
É deliberado: a classe é mapeada por convenção pelo EF Core, e colocar invariantes
nela brigaria com o change tracker. As regras de transição de status vivem no
`StatusEntregador` do Backend Core.

**O mapeamento de status precisa ser explícito.** O gerador de protobuf converte
`EM_ENTREGA` em `EmEntrega`, então `Enum.TryParse` sobre o valor gravado no banco
falhava e caía no fallback — um entregador ocupado era reportado como offline
pelo gRPC. O `EntregadorMapper` passou a traduzir com um `switch` sobre as
constantes, e há teste cobrindo cada valor.

**A escrita e a publicação não são atômicas.** O consumidor atualiza o status do
entregador no banco e depois publica `entrega.atribuida` em passos separados: se o
processo cair no meio, o pedido fica sem entregador atribuído. É a mesma dívida
descrita na seção de trade-offs do [README](../../../README.md).

---
[⬅️ Índice do Nível 3](README.md) · [Nível 2: Contêineres](../c2/c4_l2_container.md)
