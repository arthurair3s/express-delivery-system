using Data;
using Features.GerenciamentoEntregadores;
using Microsoft.EntityFrameworkCore;
using ms_entregadores_cs.Data;
using ms_entregadores_cs.Features.GerenciamentoEntregadores;
using StackExchange.Redis;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddSingleton<IConnectionMultiplexer>(sp =>
{
    var connectionString = builder.Configuration.GetConnectionString("RedisConnection")
                           ?? "localhost:6379"; 
    return ConnectionMultiplexer.Connect(connectionString);
});

builder.Services.AddScoped<EntregadorRepository>();

builder.Services.AddGrpc();

var app = builder.Build();

app.MapGrpcService<EntregadorService>();

app.MapGet("/", () => "O Microserviço de Entregadores está rodando via gRPC.");

app.Run();