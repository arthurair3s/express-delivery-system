import type { IPedidoRepository } from '../../domain/ports/IPedidoRepository.js';
import type { IUsuarioService } from '../../../usuario/application/ports/IUsuarioService.js';
import { Pedido, PedidoInvalidoError } from '../../domain/Pedido.js';
import { Coordenada } from '../../../shared/domain/value-objects/Coordenada.js';
import { Dinheiro } from '../../../shared/domain/value-objects/Dinheiro.js';
import { StatusPedido } from '../../domain/StatusPedido.js';
import { pedidosCriados } from '../../../shared/observability/metrics.js';

export interface ConfirmarPedidoInput {
  usuario_id: string | number;
  restaurante_id: string | number;
  destino_latitude?: number | null;
  destino_longitude?: number | null;
  valor_total: number;
}

export class ConfirmarPedidoUseCase {
  constructor(
    private readonly repository: IPedidoRepository,
    private readonly usuarioService: IUsuarioService
  ) {}

  async execute(dados: ConfirmarPedidoInput): Promise<Pedido> {
    let { destino_latitude, destino_longitude, usuario_id, restaurante_id, valor_total } = dados;

    if (destino_latitude == null || destino_longitude == null) {
      const usuario = await this.usuarioService.buscarPorId(usuario_id);
      if (!usuario || usuario.coordenada?.latitude == null || usuario.coordenada?.longitude == null) {
        throw new PedidoInvalidoError('Endereço de entrega não definido no perfil do usuário.');
      }
      destino_latitude = usuario.coordenada.latitude;
      destino_longitude = usuario.coordenada.longitude;
    }

    const destino = new Coordenada(Number(destino_latitude), Number(destino_longitude));

    const pedido = new Pedido(
      Number(usuario_id),
      Number(restaurante_id),
      new StatusPedido('PENDENTE'),
      new Dinheiro(Number(valor_total)),
      destino
    );

    const result = await this.repository.criarPedido(pedido);
    pedidosCriados.add(1, { restaurante_id: String(restaurante_id) });

    return result;
  }
}
