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
      var entregador = await _dbContext.Entregadores
                .AsNoTracking()
                .Select(e => new { e.Id, e.Status })
                .FirstOrDefaultAsync(e => e.Id == entregadorId);

            if (entregador != null && entregador.Status == "DISPONIVEL")
            {
                await _redis.GeoAddAsync(RedisKey, longitude, latitude, entregadorId.ToString());
            }
    }

    public async Task<Dictionary<int, (double Latitude, double Longitude)>> BuscarIdsEntregadoresProximos(double latitude, double longitude, double raioKm)
    {
      var result = await _redis.GeoSearchAsync(
          RedisKey,
          longitude,
          latitude,
          new GeoSearchCircle(raioKm, GeoUnit.Kilometers)
      );

      var dict = new Dictionary<int, (double, double)>();
      if (result.Length == 0) return dict;

      var members = result.Select(r => r.Member).ToArray();
      var positions = await _redis.GeoPositionAsync(RedisKey, members);

      for (int i = 0; i < members.Length; i++)
      {
          if (int.TryParse(members[i].ToString(), out var id) && positions[i].HasValue)
          {
              dict[id] = (positions[i].Value.Latitude, positions[i].Value.Longitude);
          }
      }

      return dict;
    }

    public async Task RemoverPosicaoRedis(int entregadorId)
    {
        _logger.LogInformation("Removendo entregador {Id} do Redis (Ficou OFFLINE)", entregadorId);
        await _redis.GeoRemoveAsync(RedisKey, entregadorId.ToString());
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
          .Where(e => ids.Contains(e.Id) && e.Status == "DISPONIVEL")
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

      if (entregador.Status != "DISPONIVEL")
          {
              await _redis.GeoRemoveAsync(RedisKey, entregador.Id.ToString());
          }
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