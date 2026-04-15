using Features.GerenciamentoEntregadores.Contracts;
using StackExchange.Redis;
using IRedisDatabase = StackExchange.Redis.IDatabase;

namespace Features.GerenciamentoEntregadores.Services
{
  public class LocalizacaoRedisService(IConnectionMultiplexer redis, ILogger<LocalizacaoRedisService> logger) : ILocalizacaoRedisService
  {
    private readonly IRedisDatabase _redis = redis.GetDatabase();
    private readonly ILogger<LocalizacaoRedisService> _logger = logger;
    private const string GeoKey = "entregadores_geo";

    public async Task AtualizaPosicaoRedis(int entregadorId, double latitude, double longitude)
    {
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
            return (pos.Latitude, pos.Longitude);
        }
        _logger.LogWarning("[Redis] GeoPosition para Entregador {Id} não encontrada na chave '{Key}'", entregadorId, GeoKey);
        return null;
    }

    public async Task<Dictionary<int, (double Latitude, double Longitude)>> BuscarIdsEntregadoresProximos(double latitude, double longitude, double raioKm)
    {
      var dict = new Dictionary<int, (double, double)>();
      GeoRadiusResult[] result;
      try
      {
          result = await _redis.GeoSearchAsync(
              GeoKey,
              longitude,
              latitude,
              new GeoSearchCircle(raioKm, GeoUnit.Kilometers)
          );
      }
      catch (Exception ex)
      {
          _logger.LogError(ex, "[Redis] Erro ao buscar entregadores próximos na base de dados em memória.");
          return dict;
      }
      if (result.Length == 0) return dict;

      var members = result.Select(r => r.Member).ToArray();
      var positions = await _redis.GeoPositionAsync(GeoKey, members);

      for (int i = 0; i < members.Length; i++)
      {
          if (int.TryParse(members[i].ToString(), out var id) && 
              positions[i].HasValue && 
              positions[i].Value.Latitude != 0 && 
              positions[i].Value.Longitude != 0)
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
  }
}
