using Grpc.Core;
using ms_entregadores_cs.Features.GerenciamentoEntregadores;
using ms_entregadores_cs.Grpc;

namespace Features.GerenciamentoEntregadores
{
  public class EntregadorService : ms_entregadores_cs.Grpc.EntregadorService.EntregadorServiceBase
  {
    private readonly EntregadorRepository _repository;

    public EntregadorService(EntregadorRepository repository)
    {
      _repository = repository;
    }

    public override async Task<LocalizacaoSummary> AtualizarLocalizacaoStream(
        IAsyncStreamReader<LocalizacaoRequest> requestStream,
        ServerCallContext context)
    {
      int updatesCount = 0;

      await foreach (var request in requestStream.ReadAllAsync(context.CancellationToken))
      {
        await _repository.AtualizaPosicaoRedis(request.EntregadorId, request.Latitude, request.Longitude);

        updatesCount++;
        Console.WriteLine($"Entregador ID: {request.EntregadorId}, Latitude: {request.Latitude}, Longitude: {request.Longitude}");
      }

      return new LocalizacaoSummary
      {
        Sucesso = true,
        Mensagem = $"Localizações atualizadas: {updatesCount}"
      };
    }

    public override async Task<EntregadorResponse> CadastrarEntregador(NovoEntregadorRequest request, ServerCallContext context)
    {
      var entidade = request.ToEntity();

      var entregadorSalvo = await _repository.CadastrarEntregador(entidade);

      return entregadorSalvo.ToResponse();
    }

    public override async Task<ListaEntregadoresResponse> BuscarProximos(
        BuscaProximaRequest request,
        ServerCallContext context)
    {
      var idsRedis = await _repository.BuscarIdsEntregadoresProximos(
          request.Latitude,
          request.Longitude,
          request.RaioKm
      );

      if (idsRedis == null || !idsRedis.Any())
      {
        return new ListaEntregadoresResponse();
      }

      var idsInt = idsRedis
          .Select(id => int.TryParse(id, out var val) ? val : 0)
          .Where(id => id > 0)
          .ToList();

      var entregadoresNoBanco = await _repository.ObterDadosEntregadoresPorIds(idsInt);

      var response = new ListaEntregadoresResponse();

      foreach (var entregador in entregadoresNoBanco)
      {
        response.Entregadores.Add(entregador.ToResponse());
      }

      return response;
    }
  }
}