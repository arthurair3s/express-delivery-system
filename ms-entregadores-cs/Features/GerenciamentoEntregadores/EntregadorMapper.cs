using ms_entregadores_cs.Grpc;

namespace Features.GerenciamentoEntregadores;

public static class EntregadorMapper
{
  public static Entregador ToEntity(this NovoEntregadorRequest request)
  {
    return new Entregador
    {
      Nome = request.Nome,
      Telefone = request.Telefone,
      Veiculo = request.Veiculo
    };
  }

  public static EntregadorResponse ToResponse(this Entregador entity, double lat = 0, double lon = 0)
  {
    return new EntregadorResponse
    {
      Id = entity.Id,
      Nome = entity.Nome ?? string.Empty,
      Telefone = entity.Telefone ?? string.Empty,
      Veiculo = entity.Veiculo ?? string.Empty,
      Latitude = lat,
      Longitude = lon
    };
  }

  public static ListaEntregadoresResponse ToListResponse(this IEnumerable<Entregador> entregadores)
  {
    var response = new ListaEntregadoresResponse();
    response.Entregadores.AddRange(entregadores.Select(e => e.ToResponse()));
    return response;
  }
}