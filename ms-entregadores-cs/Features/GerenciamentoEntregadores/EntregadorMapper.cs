using ms_entregadores_cs.Grpc;
using Features.GerenciamentoEntregadores.Constants;

namespace Features.GerenciamentoEntregadores;

public static class EntregadorMapper
{
  public static Entregador ToEntity(this NovoEntregadorRequest request)
  {
    return new Entregador
    {
      Nome = request.Nome,
      Telefone = request.Telefone,
      Veiculo = request.Veiculo,
      Status = StatusEntregadorConstants.Disponivel
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
      Longitude = lon,
      Status = MapearStatus(entity.Status)
    };
  }

  /// <summary>
  /// Traduz o status textual do banco para o enum do contrato gRPC.
  ///
  /// Não dá para usar Enum.TryParse aqui: o gerador de protobuf converte
  /// EM_ENTREGA em EmEntrega, então o parse do valor gravado no banco falhava e
  /// caía no fallback — um entregador ocupado era reportado como OFFLINE.
  /// </summary>
  private static StatusEntregador MapearStatus(string? status) =>
    (status ?? string.Empty).Trim().ToUpperInvariant() switch
    {
      StatusEntregadorConstants.Disponivel => StatusEntregador.Disponivel,
      StatusEntregadorConstants.EmEntrega => StatusEntregador.EmEntrega,
      StatusEntregadorConstants.Offline => StatusEntregador.Offline,
      // status desconhecido tira o entregador do radar, que é o padrão seguro
      _ => StatusEntregador.Offline
    };

  public static ListaEntregadoresResponse ToListResponse(this IEnumerable<Entregador> entregadores)
  {
    var response = new ListaEntregadoresResponse();
    response.Entregadores.AddRange(entregadores.Select(e => e.ToResponse()));
    return response;
  }
}