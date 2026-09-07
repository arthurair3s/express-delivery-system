using Features.ProcessamentoRotas;
using Features.ProcessamentoRotas.Contracts;

using OpenTelemetry.Resources;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using OpenTelemetry.Metrics;
using OpenTelemetry.Trace;

var builder = WebApplication.CreateBuilder(args);

// Duas portas, dois protocolos. Sem TLS o Kestrel não consegue servir h2c e
// HTTP/1.1 no mesmo listener: habilitar Http1AndHttp2 em texto claro faz o
// handshake do gRPC falhar com "Protocol error". Como o Prometheus raspa por
// HTTP/1.1, as métricas ganham um listener próprio.
var portaGrpc = int.TryParse(Environment.GetEnvironmentVariable("GRPC_PORT"), out var pg) ? pg : 5002;
var portaMetricas = int.TryParse(Environment.GetEnvironmentVariable("METRICS_PORT"), out var pm) ? pm : 9466;

builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenAnyIP(portaGrpc, o => o.Protocols = HttpProtocols.Http2);
    options.ListenAnyIP(portaMetricas, o => o.Protocols = HttpProtocols.Http1);
});

// obtém o nome do serviço e endpoint do exporter de telemetria
var otelServiceName = Environment.GetEnvironmentVariable("OTEL_SERVICE_NAME") ?? "ms-roteamento";
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


builder.Services.AddGrpc();

builder.Services.AddHttpClient("OsrmClient", client =>
{
    var osrmUrl = builder.Configuration["OSRM_URL"] ?? "http://osrm-server:5000/";
    client.BaseAddress = new Uri(osrmUrl);

    // sem timeout explícito o HttpClient usa o default de 100s: uma chamada ao OSRM
    // travado seguraria a thread do gRPC muito além do deadline do chamador (8s).
    client.Timeout = TimeSpan.FromSeconds(6);
});

builder.Services.AddScoped<IRoutingProvider, Features.ProcessamentoRotas.Providers.OsrmProvider>();
builder.Services.AddScoped<IRoteamentoService, RoteamentoLogic>();

var app = builder.Build();

app.MapPrometheusScrapingEndpoint();

app.MapGrpcService<RoteamentoService>();

app.MapGet("/", () => "Serviço de Roteamento gRPC ativo.");

app.Run();