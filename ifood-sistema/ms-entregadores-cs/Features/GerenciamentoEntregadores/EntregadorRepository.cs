using Data;
using Features.GerenciamentoEntregadores.Contracts;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using IRedisDatabase = StackExchange.Redis.IDatabase;

namespace Features.GerenciamentoEntregadores
{
    public class EntregadorRepository : IEntregadorRepository
    {
        private readonly IRedisDatabase _redis;
        private readonly AppDbContext _dbContext;
        private const string RedisKey = "entregadores_posicoes";

        public EntregadorRepository(IConnectionMultiplexer redis, AppDbContext dbContext)
        {
            _redis = redis.GetDatabase();
            _dbContext = dbContext;
        }

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
            return await _dbContext.Entregadores
                .Where(e => ids.Contains(e.Id))
                .AsNoTracking()
                .ToListAsync();
        }
    }
}