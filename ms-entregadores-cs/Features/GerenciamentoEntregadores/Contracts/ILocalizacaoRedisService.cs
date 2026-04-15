using System.Collections.Generic;
using System.Threading.Tasks;

namespace Features.GerenciamentoEntregadores.Contracts
{
    public interface ILocalizacaoRedisService
    {
        Task AtualizaPosicaoRedis(int entregadorId, double latitude, double longitude);
        Task<(double Latitude, double Longitude)?> ObterPosicaoRedis(int entregadorId);
        Task<Dictionary<int, (double Latitude, double Longitude)>> BuscarIdsEntregadoresProximos(double latitude, double longitude, double raioKm);
        Task RemoverPosicaoRedis(int entregadorId);
    }
}
