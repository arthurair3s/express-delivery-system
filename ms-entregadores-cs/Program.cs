using Data;
using Features.GerenciamentoEntregadores;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;

using OpenTelemetry.Resources;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using OpenTelemetry.Metrics;
using OpenTelemetry.Trace;

var builder = WebApplication.CreateBuilder(args);

// Duas portas, dois protocolos. Sem TLS o Kestrel não consegue servir h2c e
// HTTP/1.1 no mesmo listener: habilitar Http1AndHttp2 em texto claro faz o
// handshake do gRPC falhar com "Protocol error". Como o Prometheus raspa por
// HTTP/1.1, as métricas ganham um listener próprio.
var portaGrpc = int.TryParse(Environment.GetEnvironmentVariable("GRPC_PORT"), out var pg) ? pg : 5001;
var portaMetricas = int.TryParse(Environment.GetEnvironmentVariable("METRICS_PORT"), out var pm) ? pm : 9465;

builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenAnyIP(portaGrpc, o => o.Protocols = HttpProtocols.Http2);
    options.ListenAnyIP(portaMetricas, o => o.Protocols = HttpProtocols.Http1);
});

// obtém o nome do serviço e endpoint do exporter de telemetria
var otelServiceName = Environment.GetEnvironmentVariable("OTEL_SERVICE_NAME") ?? "ms-entregadores";
var otelEndpoint = Environment.GetEnvironmentVariable("OTEL_EXPORTER_OTLP_ENDPOINT") ?? "http://localhost:4317";

builder.Services.AddOpenTelemetry()
    .WithTracing(tracing => tracing
        .SetResourceBuilder(ResourceBuilder.CreateDefault().AddService(otelServiceName))
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddGrpcClientInstrumentation()
        .AddOtlpExporter(options =>
        {
            options.Endpoint = new Uri(otelEndpoint);
        }))
    // mesmo pipeline, segundo destino: o Prometheus raspa /metrics enquanto os
    // traces seguem para o Jaeger por OTLP. runtime instrumentation dá GC,
    // thread pool e alocação; ASP.NET Core dá volume e latência por endpoint.
    .WithMetrics(metrics => metrics
        .SetResourceBuilder(ResourceBuilder.CreateDefault().AddService(otelServiceName))
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddRuntimeInstrumentation()
        .AddPrometheusExporter());


builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddSingleton<IConnectionMultiplexer>(sp =>
{
  var redisConfig = builder.Configuration.GetConnectionString("RedisConnection")
                   ?? builder.Configuration["ConnectionStrings:RedisConnection"]
                   ?? "localhost:6379";

  return ConnectionMultiplexer.Connect(redisConfig);
});

builder.Services.AddScoped<Features.GerenciamentoEntregadores.Contracts.IEntregadorRepository, EntregadorRepository>();
builder.Services.AddScoped<Features.GerenciamentoEntregadores.Contracts.ILocalizacaoRedisService, Features.GerenciamentoEntregadores.Services.LocalizacaoRedisService>();
builder.Services.AddHostedService<Features.GerenciamentoEntregadores.Services.PedidoConfirmadoConsumer>();

builder.Services.AddGrpc();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
  var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
  var logger = scope.ServiceProvider.GetRequiredService<ILogger<AppDbContext>>();

  try
  {
    logger.LogInformation("Executando migrations no banco de dados...");
    await db.Database.MigrateAsync();
    logger.LogInformation("Migrations aplicadas com sucesso.");
  }
  catch (Exception ex)
  {
    logger.LogError(ex, "Erro ao aplicar migrations.");
  }

  var canConnect = await db.Database.CanConnectAsync();
  if (canConnect)
    logger.LogInformation("Conexão com o banco de dados estabelecida com sucesso.");
  else
    logger.LogCritical("Não foi possível conectar ao banco de dados. Verifique a connection string.");
}

app.MapPrometheusScrapingEndpoint();

app.MapGrpcService<EntregadorService>();

app.MapGet("/", () => "O Microserviço de Entregadores está rodando via gRPC.");

app.Run();