namespace Features.GerenciamentoEntregadores.Contracts
{
    public interface IEntregadorRepository
    {
        Task AtualizaPosicaoRedis(int entregadorId, double latitude, double longitude);
        Task<List<string>> BuscarIdsEntregadoresProximos(double latitude, double longitude, double raioKm);
        Task<Entregador> CadastrarEntregador(Entregador novoEntregador);
        Task<List<Entregador>> ObterDadosEntregadoresPorIds(List<int> ids);
    }
}
