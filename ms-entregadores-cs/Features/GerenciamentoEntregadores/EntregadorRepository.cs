using Data;
using Features.GerenciamentoEntregadores.Contracts;
using Features.GerenciamentoEntregadores.Constants;
using Microsoft.EntityFrameworkCore;

namespace Features.GerenciamentoEntregadores
{
  public class EntregadorRepository(AppDbContext dbContext, ILogger<EntregadorRepository> logger) : IEntregadorRepository
  {
    private readonly AppDbContext _dbContext = dbContext;
    private readonly ILogger<EntregadorRepository> _logger = logger;

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
            .Where(e => idsArray.Contains(e.Id) && (e.Status == StatusEntregadorConstants.Disponivel || e.Status == StatusEntregadorConstants.EmEntrega))
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
    }

    public async Task<bool> Deletar(int id)
    {
      var entregador = await _dbContext.Entregadores.FindAsync(id);

      if (entregador == null) return false;

      _dbContext.Entregadores.Remove(entregador);
      await _dbContext.SaveChangesAsync();

      return true;
    }
  }
}