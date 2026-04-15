using Data;
using Features.GerenciamentoEntregadores;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;

var builder = WebApplication.CreateBuilder(args);

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

builder.Services.AddGrpc();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
  var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
  var logger = scope.ServiceProvider.GetRequiredService<ILogger<AppDbContext>>();

  var canConnect = await db.Database.CanConnectAsync();
  if (canConnect)
    logger.LogInformation("Conexão com o banco de dados estabelecida com sucesso.");
  else
    logger.LogCritical("Não foi possível conectar ao banco de dados. Verifique a connection string.");
}

app.MapGrpcService<EntregadorService>();

app.MapGet("/", () => "O Microserviço de Entregadores está rodando via gRPC.");

app.Run();