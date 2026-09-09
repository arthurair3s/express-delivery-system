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

// Sobre a base cinza quase dessaturada, estas duas cores são praticamente a
// única coisa saturada no mapa — é o que faz a rota saltar sem precisar
// engrossar o traço.
export const CORES_ROTA = {
  coleta: '#1d4ed8',
  entrega: '#047857',
};

// Tema único para todos os mapas.
//
// O provedor continua sendo o tile padrão do OSM, e a simplificação vem de um
// filtro CSS sobre a camada de tiles. Parece contraintuitivo, mas foi o que
// sobrou depois de testar os basemaps minimalistas de verdade:
//
//   - CARTO Positron é exatamente o estilo desejado, mas passou a exigir chave e
//     hoje devolve o tile com "API KEY REQUIRED" carimbado — respondendo HTTP
//     200, então degrada em silêncio. Foi o que aconteceu com o dark_all daqui.
//   - Stadia Alidade Smooth responde 200 com qualquer Referer e 401 sem nenhum:
//     é tolerância, não permissão, e depender disso repetiria o erro do CARTO.
//   - Os "canvas" cinza da Esri (claro e escuro) não pedem chave, mas são de
//     baixo contraste de propósito — são fundo para dado denso em tela grande.
//     Num cartão de 300px as vias somem, e aumentar o contraste não recupera:
//     as ruas são brancas sobre cinza-claro, então o filtro estoura as duas
//     juntas para branco. Além disso só têm dado até o zoom 16.
//
// Dessaturar o OSM tira o que de fato polui — ícones de comércio coloridos,
// vias amarelas e laranjas, parques verdes — sem perder a hierarquia das ruas.
// E o filtro atinge só a camada de tiles: a rota e os marcadores são SVG em
// outro pane, então continuam saturados e passam a ser a única cor forte na
// tela.
export const TILE = {
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  filtro: 'saturate(0.18) brightness(1.06) contrast(0.92)',
};
