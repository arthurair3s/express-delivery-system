using Features.ProcessamentoRotas;
using Features.ProcessamentoRotas.Contracts;
using Features.ProcessamentoRotas.Exceptions;
using ms_roteamento_cs.Grpc;
using NSubstitute;

namespace MsTests;

/// <summary>
/// O serviço de roteamento delega ao provedor, mas a delegação carrega decisões
/// que valem proteger: a ordem de origem e destino, e a montagem da lista de
/// pontos. Inverter origem e destino não gera erro — gera uma rota errada, que
/// só aparece no mapa do cliente.
/// </summary>
public class RoteamentoLogicTests
{
    private readonly IRoutingProvider _provedor = Substitute.For<IRoutingProvider>();
    private readonly RoteamentoLogic _logica;

    private static Localizacao Ponto(double lat, double lon) => new() { Latitude = lat, Longitude = lon };

    public RoteamentoLogicTests() => _logica = new RoteamentoLogic(_provedor);

    [Fact]
    public async Task ResumoPreservaAOrdemDeOrigemEDestino()
    {
        var origem = Ponto(-22.90, -43.20);
        var destino = Ponto(-22.97, -43.18);
        _provedor.GetRouteSummaryAsync(Arg.Any<Localizacao>(), Arg.Any<Localizacao>())
                 .Returns(new ResumoRotaResponse { DistanciaKm = 8.2, DuracaoEstimadaSegundos = 900 });

        var resumo = await _logica.CalcularResumo(new RotaRequest { Origem = origem, Destino = destino });

        await _provedor.Received(1).GetRouteSummaryAsync(origem, destino);
        Assert.Equal(8.2, resumo.DistanciaKm);
        Assert.Equal(900, resumo.DuracaoEstimadaSegundos);
    }

    [Fact]
    public async Task GeometriaDeDoisPontosViraUmaListaNaOrdemCerta()
    {
        var origem = Ponto(-22.90, -43.20);
        var destino = Ponto(-22.97, -43.18);
        _provedor.GetRouteGeometryAsync(Arg.Any<List<Localizacao>>()).Returns(new GeometriaRotaResponse());

        await _logica.ObterGeometria(new RotaRequest { Origem = origem, Destino = destino });

        await _provedor.Received(1).GetRouteGeometryAsync(
            Arg.Is<List<Localizacao>>(p => p.Count == 2 && p[0] == origem && p[1] == destino));
    }

    [Fact]
    public async Task RotaComParadasRepassaTodosOsPontosNaOrdem()
    {
        // é o trajeto entregador -> restaurante -> cliente: a ordem é o percurso
        var request = new MultiplosPontosRequest();
        var entregador = Ponto(-22.88, -43.25);
        var restaurante = Ponto(-22.90, -43.20);
        var cliente = Ponto(-22.97, -43.18);
        request.Pontos.AddRange(new[] { entregador, restaurante, cliente });
        _provedor.GetRouteGeometryAsync(Arg.Any<List<Localizacao>>()).Returns(new GeometriaRotaResponse());

        await _logica.CalcularMultiplosPontos(request);

        await _provedor.Received(1).GetRouteGeometryAsync(
            Arg.Is<List<Localizacao>>(p =>
                p.Count == 3 && p[0] == entregador && p[1] == restaurante && p[2] == cliente));
    }

    [Fact]
    public async Task EncaixeNaEstradaDevolveOPontoAjustadoPeloProvedor()
    {
        var bruto = Ponto(-22.9001, -43.2001);
        var ajustado = Ponto(-22.9000, -43.2000);
        _provedor.SnapToRoadAsync(bruto).Returns(ajustado);

        var resultado = await _logica.EncaixarNaEstrada(bruto);

        Assert.Equal(ajustado, resultado);
    }

    [Fact]
    public async Task FalhaDoProvedorSobeParaOChamador()
    {
        // o serviço não engole a exceção: o gRPC precisa devolver erro para que o
        // deadline e a retentativa do chamador façam sentido
        _provedor.GetRouteSummaryAsync(Arg.Any<Localizacao>(), Arg.Any<Localizacao>())
                 .Returns<ResumoRotaResponse>(_ => throw new ProviderUnavailableException("OSRM fora do ar"));

        await Assert.ThrowsAsync<ProviderUnavailableException>(() =>
            _logica.CalcularResumo(new RotaRequest { Origem = Ponto(0, 0), Destino = Ponto(1, 1) }));
    }
}
