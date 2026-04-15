using Features.ProcessamentoRotas;
using Features.ProcessamentoRotas.Contracts;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddGrpc();

builder.Services.AddHttpClient("OsrmClient", client =>
{
    var osrmUrl = builder.Configuration["OSRM_URL"] ?? "http://172.20.0.10:5000/";
    client.BaseAddress = new Uri(osrmUrl);
});

builder.Services.AddScoped<IRoutingProvider, Features.ProcessamentoRotas.Providers.OsrmProvider>();
builder.Services.AddScoped<IRoteamentoService, RoteamentoLogic>();

var app = builder.Build();

app.MapGrpcService<RoteamentoService>();

app.MapGet("/", () => "Serviço de Roteamento gRPC ativo.");

app.Run();