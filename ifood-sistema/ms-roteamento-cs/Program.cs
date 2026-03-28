using Features.ProcessamentoRotas;
using Features.ProcessamentoRotas.Contracts;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddGrpc();

builder.Services.AddHttpClient(nameof(RoteamentoLogic), client =>
{
    var osrmUrl = builder.Configuration["OSRM_URL"] ?? "http://osrm-server:5000/";
    client.BaseAddress = new Uri(osrmUrl);
});

builder.Services.AddScoped<IRoteamentoService, RoteamentoLogic>();

var app = builder.Build();

app.MapGrpcService<RoteamentoService>();

app.MapGet("/", () => "Serviço de Roteamento gRPC ativo.");

app.Run();