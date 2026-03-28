using Grpc.Core;
using ms_roteamento_cs.Grpc;
using Features.ProcessamentoRotas.Contracts;

namespace Features.ProcessamentoRotas
{
  public class RoteamentoService(IRoteamentoService logic) : ms_roteamento_cs.Grpc.RoteamentoService.RoteamentoServiceBase
  {
    private readonly IRoteamentoService _logic = logic;

    public override async Task<ResumoRotaResponse> CalcularResumoRota(RotaRequest request, ServerCallContext context)
    {
      return await _logic.CalcularResumo(request);
    }

    public override async Task<GeometriaRotaResponse> ObterGeometriaRota(RotaRequest request, ServerCallContext context)
    {
      return await _logic.ObterGeometria(request);
    }

    public override async Task<GeometriaRotaResponse> CalcularRotaMultiplosPontos(MultiplosPontosRequest request, ServerCallContext context)
    {
      return await _logic.CalcularMultiplosPontos(request);
    }
  }
}