using ms_roteamento_cs.Grpc;

namespace Features.ProcessamentoRotas.Contracts
{
    public interface IRoteamentoService
    {
        Task<ResumoRotaResponse> CalcularResumo(RotaRequest request);
        Task<GeometriaRotaResponse> ObterGeometria(RotaRequest request);
        Task<GeometriaRotaResponse> CalcularMultiplosPontos(MultiplosPontosRequest request);
    }
}