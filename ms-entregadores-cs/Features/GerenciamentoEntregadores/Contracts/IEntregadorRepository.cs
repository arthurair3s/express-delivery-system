namespace Features.GerenciamentoEntregadores.Contracts
{
    public interface IEntregadorRepository
    {
        Task<Entregador> CadastrarEntregador(Entregador novoEntregador);
        Task<Entregador?> ObterPorId(int id);
        Task<List<Entregador>> ListarTodos();
        Task<List<Entregador>> ObterDadosEntregadoresPorIds(List<int> ids);
        Task Atualizar(Entregador entregador);
        Task<bool> Deletar(int id);
    }
}