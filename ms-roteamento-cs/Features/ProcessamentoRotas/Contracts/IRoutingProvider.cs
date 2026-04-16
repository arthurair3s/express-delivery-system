using ms_roteamento_cs.Grpc;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Features.ProcessamentoRotas.Contracts
{
    public interface IRoutingProvider
    {
        Task<ResumoRotaResponse> GetRouteSummaryAsync(Localizacao origem, Localizacao destino);
        Task<GeometriaRotaResponse> GetRouteGeometryAsync(List<Localizacao> pontos);
        Task<Localizacao> SnapToRoadAsync(Localizacao ponto);
    }
}
