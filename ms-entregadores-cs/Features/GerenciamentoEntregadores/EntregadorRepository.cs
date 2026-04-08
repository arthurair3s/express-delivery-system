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
    private const string GeoKey = "entregadores_geo";

    public async Task AtualizaPosicaoRedis(int entregadorId, double latitude, double longitude)
    {
        // Grava diretamente no Redis sem re-consultar o banco.
        // O Node BFF já validou o entregador antes de chamar o gRPC.
        _logger.LogInformation("[Redis] GeoAdd -> Entregador {Id} em ({Lat}, {Lon})", entregadorId, latitude, longitude);
        var added = await _redis.GeoAddAsync(GeoKey, longitude, latitude, entregadorId.ToString());
        _logger.LogInformation("[Redis] GeoAdd resultado: {Added}", added);
    }

    public async Task<(double Latitude, double Longitude)?> ObterPosicaoRedis(int entregadorId)
    {
        var positions = await _redis.GeoPositionAsync(GeoKey, new RedisValue[] { entregadorId.ToString() });
        if (positions != null && positions.Length > 0 && positions[0].HasValue)
        {
            var pos = positions[0].Value;
            _logger.LogInformation("[Redis] GeoPosition encontrada para {Id}: Lon={Lon}, Lat={Lat}", entregadorId, pos.Longitude, pos.Latitude);
            // GeoPosition retorna (Longitude, Latitude) nessa ordem
            return (pos.Latitude, pos.Longitude);
        }
        _logger.LogWarning("[Redis] GeoPosition para Entregador {Id} não encontrada na chave '{Key}'", entregadorId, GeoKey);
        return null;
    }

    public async Task<Dictionary<int, (double Latitude, double Longitude)>> BuscarIdsEntregadoresProximos(double latitude, double longitude, double raioKm)
    {
      var result = await _redis.GeoSearchAsync(
          GeoKey,
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
        await _redis.GeoRemoveAsync(GeoKey, entregadorId.ToString());
    }

    public async Task<Entregador> CadastrarEntregador(Entregador novoEntregador)
    {
      _dbContext.Entregadores.Add(novoEntregador);
      await _dbContext.SaveChangesAsync();
      return novoEntregador;
    }

    public async Task<List<Entregador>> ObterDadosEntregadoresPorIds(List<int> ids)
    {
        var idsArray = ids.ToArray();
        return await _dbContext.Entregadores
            .Where(e => idsArray.Contains(e.Id) && (e.Status == "DISPONIVEL" || e.Status == "EM_ENTREGA"))
            .AsNoTracking()
            .ToListAsync();
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

      if (entregador.Status?.ToUpper() == "OFFLINE")
          {
              await _redis.GeoRemoveAsync(GeoKey, entregador.Id.ToString());
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