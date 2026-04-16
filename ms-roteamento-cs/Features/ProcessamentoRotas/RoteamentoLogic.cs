using Features.ProcessamentoRotas.Contracts;
using ms_roteamento_cs.Grpc;

namespace Features.ProcessamentoRotas
{
  public class RoteamentoLogic(IRoutingProvider routingProvider) : IRoteamentoService
  {
    private readonly IRoutingProvider _routingProvider = routingProvider;

    public async Task<ResumoRotaResponse> CalcularResumo(RotaRequest request)
    {
      return await _routingProvider.GetRouteSummaryAsync(request.Origem, request.Destino);
    }

    public async Task<GeometriaRotaResponse> ObterGeometria(RotaRequest request)
    {
      return await _routingProvider.GetRouteGeometryAsync([request.Origem, request.Destino]);
    }

    public async Task<GeometriaRotaResponse> CalcularMultiplosPontos(MultiplosPontosRequest request)
    {
      return await _routingProvider.GetRouteGeometryAsync(request.Pontos.ToList());
    }

    public async Task<Localizacao> EncaixarNaEstrada(Localizacao ponto)
    {
      return await _routingProvider.SnapToRoadAsync(ponto);
    }
  }
}