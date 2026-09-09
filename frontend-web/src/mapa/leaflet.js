import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import iconePadrao from 'leaflet/dist/images/marker-icon.png';
import iconePadrao2x from 'leaflet/dist/images/marker-icon-2x.png';
import sombraPadrao from 'leaflet/dist/images/marker-shadow.png';

// O leaflet monta a URL do ícone padrão por conta própria, e erra o alvo quando
// o bundler reescreve os caminhos dos assets. A correção estava repetida nos
// três componentes que desenham mapa, cada um apontando para o CDN do unpkg —
// aqui ela acontece uma vez, sobre os arquivos que já vêm no pacote.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconePadrao2x,
  iconUrl: iconePadrao,
  shadowUrl: sombraPadrao,
});

const marcador = (arquivo) =>
  L.icon({ iconUrl: arquivo, iconSize: [40, 40], iconAnchor: [20, 20] });

// Os três marcadores do sistema, servidos de `public/icons`. O seletor de
// endereço puxava o dele de um CDN externo, o que quebrava o mapa offline e
// deixava um pedido para fora do domínio em cada carga.
export const ICONES = {
  entregador: marcador('/icons/entregador-icon.png'),
  restaurante: marcador('/icons/restaurante-icon.png'),
  cliente: marcador('/icons/cliente-icon.png'),
};

// Calibradas para o tile claro do OSM: tons saturados e escuros o suficiente
// para sobreviverem ao fundo bege das vias.
export const CORES_ROTA = {
  coleta: '#1d4ed8',
  entrega: '#047857',
};

// Tema único para todos os mapas.
//
// Era o dark_all do CARTO em dois dos quatro mapas — mas o CARTO passou a exigir
// chave de API e agora devolve o tile com "API KEY REQUIRED" carimbado por cima,
// respondendo HTTP 200. Ou seja: nunca falhou de forma visível, só foi
// degradando calado, inclusive no mapa de rastreamento. O tile padrão do OSM não
// pede chave e é o que os outros dois mapas já usavam.
export const TILE = {
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
};
