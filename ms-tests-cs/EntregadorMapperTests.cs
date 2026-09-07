using Features.GerenciamentoEntregadores;
using Features.GerenciamentoEntregadores.Constants;
using ms_entregadores_cs.Grpc;

namespace MsTests;

/// <summary>
/// O mapper é a fronteira entre a entidade do EF Core e o contrato gRPC.
/// Um erro aqui não quebra o build nem lança exceção: ele devolve um entregador
/// com o status errado, e a atribuição de corridas passa a decidir errado.
/// </summary>
public class EntregadorMapperTests
{
    [Fact]
    public void EntregadorNovoNasceDisponivel()
    {
        // um cadastro recém-criado precisa entrar no radar de corridas
        var request = new NovoEntregadorRequest { Nome = "Ana", Telefone = "11999999999", Veiculo = "Moto" };

        var entidade = request.ToEntity();

        Assert.Equal(StatusEntregadorConstants.Disponivel, entidade.Status);
        Assert.Equal("Ana", entidade.Nome);
        Assert.Equal("Moto", entidade.Veiculo);
    }

    [Theory]
    [InlineData("DISPONIVEL", StatusEntregador.Disponivel)]
    [InlineData("EM_ENTREGA", StatusEntregador.EmEntrega)]
    [InlineData("OFFLINE", StatusEntregador.Offline)]
    [InlineData("disponivel", StatusEntregador.Disponivel)]
    public void ConverteOStatusDoBancoParaOEnumDoContrato(string statusNoBanco, StatusEntregador esperado)
    {
        var entidade = new Entregador { Id = 1, Nome = "Ana", Status = statusNoBanco };

        Assert.Equal(esperado, entidade.ToResponse().Status);
    }

    [Theory]
    [InlineData("STATUS_INEXISTENTE")]
    [InlineData("")]
    [InlineData(null)]
    public void StatusIrreconheciveVirasOfflineEmVezDeQuebrar(string? statusInvalido)
    {
        // fallback deliberado: um dado corrompido no banco não pode derrubar a
        // listagem inteira, e OFFLINE é o padrão seguro — tira o entregador do radar
        var entidade = new Entregador { Id = 1, Nome = "Ana", Status = statusInvalido };

        Assert.Equal(StatusEntregador.Offline, entidade.ToResponse().Status);
    }

    [Fact]
    public void CamposNulosViramStringVaziaPorqueProtobufNaoAceitaNull()
    {
        var entidade = new Entregador { Id = 2, Nome = null, Telefone = null, Veiculo = null, Status = "OFFLINE" };

        var resposta = entidade.ToResponse();

        Assert.Equal(string.Empty, resposta.Nome);
        Assert.Equal(string.Empty, resposta.Telefone);
        Assert.Equal(string.Empty, resposta.Veiculo);
    }

    [Fact]
    public void CoordenadasVemDoRedisENaoDaEntidade()
    {
        // a posição é estado volátil no Redis; o banco guarda só o cadastro
        var entidade = new Entregador { Id = 3, Nome = "Ana", Status = "DISPONIVEL" };

        var resposta = entidade.ToResponse(-22.9068, -43.1729);

        Assert.Equal(-22.9068, resposta.Latitude, precision: 4);
        Assert.Equal(-43.1729, resposta.Longitude, precision: 4);
    }

    [Fact]
    public void SemCoordenadasOEntregadorVaiComZeroZero()
    {
        var resposta = new Entregador { Id = 4, Nome = "Ana", Status = "DISPONIVEL" }.ToResponse();

        Assert.Equal(0, resposta.Latitude);
        Assert.Equal(0, resposta.Longitude);
    }

    [Fact]
    public void ListaPreservaAOrdemEAQuantidade()
    {
        var entregadores = new List<Entregador>
        {
            new() { Id = 1, Nome = "Ana",   Status = "DISPONIVEL" },
            new() { Id = 2, Nome = "Bruno", Status = "EM_ENTREGA" },
            new() { Id = 3, Nome = "Caio",  Status = "OFFLINE" },
        };

        var resposta = entregadores.ToListResponse();

        Assert.Equal(3, resposta.Entregadores.Count);
        Assert.Equal(new[] { "Ana", "Bruno", "Caio" }, resposta.Entregadores.Select(e => e.Nome));
        Assert.Equal(StatusEntregador.EmEntrega, resposta.Entregadores[1].Status);
    }

    [Fact]
    public void ListaVaziaNaoQuebra()
    {
        Assert.Empty(Array.Empty<Entregador>().ToListResponse().Entregadores);
    }
}
