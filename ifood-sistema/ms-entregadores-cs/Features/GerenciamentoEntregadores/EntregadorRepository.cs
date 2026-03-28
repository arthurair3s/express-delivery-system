using Data;
using Features.GerenciamentoEntregadores.Contracts;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;
using IRedisDatabase = StackExchange.Redis.IDatabase;

namespace Features.GerenciamentoEntregadores
{
  public class EntregadorRepository(IConnectionMultiplexer redis, AppDbContext dbContext, ILogger<EntregadorRepository> logger) : IEntregadorRepository
  {
    private readonly IRedisDatabase _redis = redis.GetDatabase();
    private readonly AppDbContext _dbContext = dbContext;
    private readonly ILogger<EntregadorRepository> _logger = logger;
    private const string RedisKey = "entregadores_posicoes";

    public async Task AtualizaPosicaoRedis(int entregadorId, double latitude, double longitude)
    {
      await _redis.GeoAddAsync(RedisKey, longitude, latitude, entregadorId.ToString());
    }

    public async Task<List<string>> BuscarIdsEntregadoresProximos(double latitude, double longitude, double raioKm)
    {
      var result = await _redis.GeoSearchAsync(
          RedisKey,
          longitude,
          latitude,
          new GeoSearchCircle(raioKm, GeoUnit.Kilometers)
      );

      return result.Select(r => r.Member.ToString()).ToList();
    }

    public async Task<Entregador> CadastrarEntregador(Entregador novoEntregador)
    {
      _dbContext.Entregadores.Add(novoEntregador);
      await _dbContext.SaveChangesAsync();
      return novoEntregador;
    }

    public async Task<List<Entregador>> ObterDadosEntregadoresPorIds(List<int> ids)
    {
      _logger.LogInformation("Buscando no Postgres os IDs: {Ids}", string.Join(", ", ids));

      var lista = await _dbContext.Entregadores
          .Where(e => ids.Contains(e.Id))
          .AsNoTracking()
          .ToListAsync();

      _logger.LogInformation("Registros encontrados no banco: {Count}", lista.Count);

      return lista;
    }

    public async Task<Entregador?> ObterPorId(int id)
    {
      return await _dbContext.Entregadores.FindAsync(id);
    }

    public async Task<List<Entregador>> ListarTodos()
    {
      return await _dbContext.Entregadores
          .AsNoTracking()
          .OrderBy(e => e.Nome)
          .ToListAsync();
    }

    public async Task Atualizar(Entregador entregador)
    {
      _dbContext.Entregadores.Update(entregador);
      await _dbContext.SaveChangesAsync();
    }

    public async Task<bool> Deletar(int id)
    {
      var entregador = await _dbContext.Entregadores.FindAsync(id);

      if (entregador == null) return false;

      _dbContext.Entregadores.Remove(entregador);
      await _dbContext.SaveChangesAsync();

      await _redis.GeoRemoveAsync(RedisKey, id.ToString());

      return true;
    }
  }
}