using Features.ProcessamentoRotas.Contracts;
using Features.ProcessamentoRotas.Exceptions;
using ms_roteamento_cs.Grpc;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System.Globalization;

namespace Features.ProcessamentoRotas.Providers
{
    public class OsrmProvider(IHttpClientFactory httpClientFactory, ILogger<OsrmProvider> logger) : IRoutingProvider
    {
        private readonly HttpClient _httpClient = httpClientFactory.CreateClient("OsrmClient");
        private readonly ILogger<OsrmProvider> _logger = logger;

        public async Task<ResumoRotaResponse> GetRouteSummaryAsync(Localizacao origem, Localizacao destino)
        {
            var coords = $"{origem.Longitude.ToString(CultureInfo.InvariantCulture)},{origem.Latitude.ToString(CultureInfo.InvariantCulture)};{destino.Longitude.ToString(CultureInfo.InvariantCulture)},{destino.Latitude.ToString(CultureInfo.InvariantCulture)}";
            var url = $"route/v1/driving/{coords}?overview=false";

            _logger.LogInformation("[OSRM] Solicitando resumo para: {Url}", url);

            string jsonString;
            try
            {
                jsonString = await _httpClient.GetStringAsync(url);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[OSRM] Falha de comunicação com o provedor de rotas no endpoint de resumo.");
                throw new ProviderUnavailableException("OSRM não está respondendo.");
            }

            var response = JsonConvert.DeserializeObject<JObject>(jsonString);

            var route = response?["routes"]?[0];

            if (route == null) throw new RouteNotFoundException("Nenhuma rota encontrada.");

            return new ResumoRotaResponse
            {
                DistanciaKm = route["distance"]!.Value<double>() / 1000,
                DuracaoEstimadaSegundos = (int)route["duration"]!.Value<double>()
            };
        }

        public async Task<GeometriaRotaResponse> GetRouteGeometryAsync(List<Localizacao> pontos)
        {
            var coords = string.Join(";", pontos.Select(p =>
                $"{p.Longitude.ToString(CultureInfo.InvariantCulture)},{p.Latitude.ToString(CultureInfo.InvariantCulture)}"));

            var url = $"route/v1/driving/{coords}?geometries=geojson&overview=full";
            _logger.LogInformation("[OSRM] Obtendo geometria para: {Url}", url);

            string jsonString;
            try
            {
                jsonString = await _httpClient.GetStringAsync(url);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[OSRM] Falha de comunicação com o provedor de rotas ao obter geometria.");
                throw new ProviderUnavailableException("OSRM não está respondendo.");
            }

            var response = JsonConvert.DeserializeObject<JObject>(jsonString);

            var route = response?["routes"]?[0];
            var geometry = route?["geometry"]?["coordinates"];

            if (route == null || geometry == null) throw new RouteNotFoundException("Erro ao processar geometria da rota.");

            var res = new GeometriaRotaResponse
            {
                DistanciaTotalKm = route["distance"]!.Value<double>() / 1000,
                DuracaoTotalSegundos = (int)route["duration"]!.Value<double>()
            };

            foreach (var coord in geometry)
            {
                res.Caminho.Add(new Localizacao
                {
                    Longitude = coord[0]!.Value<double>(),
                    Latitude = coord[1]!.Value<double>()
                });
            }

            return res;
        }
    }
}
