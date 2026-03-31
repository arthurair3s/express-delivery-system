namespace Features.GerenciamentoEntregadores.Contracts
{
    public interface IEntregadorRepository
    {
        Task AtualizaPosicaoRedis(int entregadorId, double latitude, double longitude);
        Task<Dictionary<int, (double Latitude, double Longitude)>> BuscarIdsEntregadoresProximos(double latitude, double longitude, double raioKm);
        Task RemoverPosicaoRedis(int entregadorId);
        Task<Entregador> CadastrarEntregador(Entregador novoEntregador);
        Task<Entregador?> ObterPorId(int id);
        Task<List<Entregador>> ListarTodos();
        Task<List<Entregador>> ObterDadosEntregadoresPorIds(List<int> ids);
        Task Atualizar(Entregador entregador);
        Task<bool> Deletar(int id);
    }
}