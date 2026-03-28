using Features.ProcessamentoRotas.Contracts;
using ms_roteamento_cs.Grpc;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace Features.ProcessamentoRotas
{
  public class RoteamentoLogic(IHttpClientFactory httpClientFactory, ILogger<RoteamentoLogic> logger) : IRoteamentoService
  {
    private readonly HttpClient _httpClient = httpClientFactory.CreateClient(nameof(RoteamentoLogic));
    private readonly ILogger<RoteamentoLogic> _logger = logger;

    public async Task<ResumoRotaResponse> CalcularResumo(RotaRequest request)
    {
      var coords = $"{request.Origem.Longitude.ToString().Replace(",", ".")},{request.Origem.Latitude.ToString().Replace(",", ".")};{request.Destino.Longitude.ToString().Replace(",", ".")},{request.Destino.Latitude.ToString().Replace(",", ".")}";
      var url = $"route/v1/driving/{coords}?overview=false";

      var jsonString = await _httpClient.GetStringAsync(url);
      var response = JsonConvert.DeserializeObject<JObject>(jsonString);

      var route = response["routes"]?[0];

      if (route == null) throw new Exception("Nenhuma rota encontrada.");

      return new ResumoRotaResponse
      {
        DistanciaKm = route["distance"].Value<double>() / 1000,
        DuracaoEstimadaSegundos = (int)route["duration"].Value<double>()
      };
    }

    public async Task<GeometriaRotaResponse> ObterGeometria(RotaRequest request)
    {
      return await CalcularRotaGenerica(new List<Localizacao> { request.Origem, request.Destino });
    }

    public async Task<GeometriaRotaResponse> CalcularMultiplosPontos(MultiplosPontosRequest request)
    {
      return await CalcularRotaGenerica(request.Pontos.ToList());
    }

    private async Task<GeometriaRotaResponse> CalcularRotaGenerica(List<Localizacao> pontos)
    {
      var coords = string.Join(";", pontos.Select(p =>
          $"{p.Longitude.ToString().Replace(",", ".")},{p.Latitude.ToString().Replace(",", ".")}"));

      var url = $"route/v1/driving/{coords}?geometries=geojson&overview=full";

      var jsonString = await _httpClient.GetStringAsync(url);
      var response = JsonConvert.DeserializeObject<JObject>(jsonString);

      var route = response["routes"]?[0];
      var geometry = route?["geometry"]?["coordinates"];

      if (route == null || geometry == null) throw new Exception("Erro ao processar geometria da rota.");

      var res = new GeometriaRotaResponse
      {
        DistanciaTotalKm = route["distance"].Value<double>() / 1000,
        DuracaoTotalSegundos = (int)route["duration"].Value<double>()
      };

      foreach (var coord in geometry)
      {
        res.Caminho.Add(new Localizacao
        {
          Longitude = coord[0].Value<double>(),
          Latitude = coord[1].Value<double>()
        });
      }

      return res;
    }
  }
}