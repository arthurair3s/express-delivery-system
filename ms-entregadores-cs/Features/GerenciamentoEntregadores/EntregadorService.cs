using Grpc.Core;
using ms_entregadores_cs.Grpc;

namespace Features.GerenciamentoEntregadores
{
  public class EntregadorService(EntregadorRepository repository) : ms_entregadores_cs.Grpc.EntregadorService.EntregadorServiceBase
  {
    private readonly EntregadorRepository _repository = repository;

    public override async Task<LocalizacaoSummary> AtualizarLocalizacaoStream(
        IAsyncStreamReader<LocalizacaoRequest> requestStream,
        ServerCallContext context)
    {
      int updatesCount = 0;
      await foreach (var request in requestStream.ReadAllAsync(context.CancellationToken))
      {
        await _repository.AtualizaPosicaoRedis(request.EntregadorId, request.Latitude, request.Longitude);
        updatesCount++;
      }
      return new LocalizacaoSummary { Sucesso = true, Mensagem = $"Atualizações: {updatesCount}" };
    }

    public override async Task<EntregadorResponse> CadastrarEntregador(NovoEntregadorRequest request, ServerCallContext context)
    {
      var entidade = request.ToEntity();
      var entregadorSalvo = await _repository.CadastrarEntregador(entidade);
      return entregadorSalvo.ToResponse();
    }

    public override async Task<ListaEntregadoresResponse> BuscarProximos(BuscaProximaRequest request, ServerCallContext context)
    {
        var idsRedis = await _repository.BuscarIdsEntregadoresProximos(request.Latitude, request.Longitude, request.RaioKm);

        if (idsRedis == null || !idsRedis.Any()) return new ListaEntregadoresResponse();

        var idsInt = idsRedis.Keys.ToList();
        
        var entregadoresNoBanco = await _repository.ObterDadosEntregadoresPorIds(idsInt);
        
        var candidatos = entregadoresNoBanco.Where(e => e.Status == "DISPONIVEL" || e.Status == "EM_ENTREGA").ToList();

        var response = new ListaEntregadoresResponse();
        response.Entregadores.AddRange(candidatos.Select(e => 
        {
            var pos = idsRedis[e.Id];
            return e.ToResponse(pos.Latitude, pos.Longitude);
        }));
        return response;
    }

    public override async Task<EntregadorResponse> AtualizarStatus(AtualizarStatusRequest request, ServerCallContext context)
    {
      var entregador = await _repository.ObterPorId(request.Id);

      if (entregador == null)
          throw new RpcException(new Status(StatusCode.NotFound, $"Entregador {request.Id} não encontrado."));

      entregador.Status = request.NovoStatus switch {
          StatusEntregador.EmEntrega => "EM_ENTREGA",
          _ => request.NovoStatus.ToString().ToUpper()
      };
      
      await _repository.Atualizar(entregador);

      return entregador.ToResponse();
    }


    public override async Task<ListaEntregadoresResponse> ListarTodosEntregadores(Vazio request, ServerCallContext context)
    {
      var entregadores = await _repository.ListarTodos();
      var response = new ListaEntregadoresResponse();
      response.Entregadores.AddRange(entregadores.Select(e => e.ToResponse()));
      return response;
    }

    public override async Task<EntregadorResponse> ObterEntregadorPorId(IdRequest request, ServerCallContext context)
    {
      var entregador = await _repository.ObterPorId(request.Id);

      if (entregador == null)
        throw new RpcException(new Status(StatusCode.NotFound, $"Entregador {request.Id} não encontrado."));

      var pos = await _repository.ObterPosicaoRedis(entregador.Id);
      if (pos.HasValue) {
          return entregador.ToResponse(pos.Value.Latitude, pos.Value.Longitude);
      }

      return entregador.ToResponse();
    }

    public override async Task<EntregadorResponse> EditarEntregador(EditarEntregadorRequest request, ServerCallContext context)
    {
      var entregadorExistente = await _repository.ObterPorId(request.Id);

      if (entregadorExistente == null)
        throw new RpcException(new Status(StatusCode.NotFound, "Entregador não encontrado para edição."));

      entregadorExistente.Nome = request.Nome;
      entregadorExistente.Telefone = request.Telefone;
      entregadorExistente.Veiculo = request.Veiculo;

      await _repository.Atualizar(entregadorExistente);

      return entregadorExistente.ToResponse();
    }

    public override async Task<SucessoResponse> DeletarEntregador(IdRequest request, ServerCallContext context)
    {
      var deletado = await _repository.Deletar(request.Id);

      return new SucessoResponse { Sucesso = deletado };
    }
  }
}