using Features.ProcessamentoRotas;
using Features.ProcessamentoRotas.Contracts;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddGrpc();

builder.Services.AddHttpClient(nameof(RoteamentoLogic), client =>
{
    client.BaseAddress = new Uri("http://172.20.0.10:5000/");
});

builder.Services.AddScoped<IRoteamentoService, RoteamentoLogic>();

var app = builder.Build();

app.MapGrpcService<RoteamentoService>();

app.MapGet("/", () => "Serviço de Roteamento gRPC ativo.");

app.Run();