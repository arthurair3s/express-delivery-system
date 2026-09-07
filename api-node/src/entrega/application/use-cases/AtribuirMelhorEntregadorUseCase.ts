import type { IEntregaRepository } from '../../domain/ports/IEntregaRepository.js'
import type { IPedidoService } from '../../../pedido/application/ports/IPedidoService.js'
import type { IEntregadorService } from '../../../entregador/application/ports/IEntregadorService.js'
import type { IRestauranteService } from '../../../restaurante/application/ports/IRestauranteService.js'
import type { IRoteamentoService } from '../../../roteamento/application/ports/IRoteamentoService.js'
import { Entrega, EntregaInvalidaError } from '../../domain/Entrega.js'
import { StatusEntrega } from '../../domain/StatusEntrega.js'
import { logger } from '../../../shared/utils/logger.js'
import { entregasAtribuidas } from '../../../shared/observability/metrics.js'

export class AtribuirMelhorEntregadorUseCase {
  constructor(
    private readonly repository: IEntregaRepository,
    private readonly pedidoService: IPedidoService,
    private readonly restauranteService: IRestauranteService,
    private readonly entregadorService: IEntregadorService,
    private readonly roteamentoService: IRoteamentoService
  ) {}

  async execute(pedidoId: number | string): Promise<Entrega> {
    const pedido = await this.pedidoService.buscarPorId(pedidoId)
    if (!pedido) throw new EntregaInvalidaError('Pedido não encontrado.')

    const restaurante = await this.restauranteService.buscarPorId(pedido.restaurante_id)
    if (!restaurante || restaurante.latitude == null || restaurante.longitude == null) {
      throw new EntregaInvalidaError('Restaurante sem coordenadas geográficas cadastradas.')
    }

    let candidatos = await this.entregadorService.listarProximosAoRestaurante(restaurante.id!, 2.0)
    
    if (!candidatos || candidatos.length === 0) {
      logger.info(`Ninguém a 2.0km. Tentando busca elástica de 3.5km...`, 'EntregaService');
      candidatos = await this.entregadorService.listarProximosAoRestaurante(restaurante.id!, 3.5);
    }

    let melhor = null
    let etaFinal = 0

    if (!candidatos || candidatos.length === 0) {
      logger.warn(`Radar vazio para o restaurante ${restaurante.nome} (ID: ${restaurante.id}). Falha ao encontrar motoboys.`, 'EntregaService');
      throw new EntregaInvalidaError('Nenhum entregador disponível num raio de 3.5km.');
    }

    const disponiveis = candidatos.filter(e => e.statusObj.estaDisponivel())

    if (disponiveis.length === 0) {
      logger.warn('Candidatos no radar estão ocupados. Falhando atribuição.', 'EntregaService');
      throw new EntregaInvalidaError('Todos os entregadores na região estão ocupados no momento.');
    }

    const selecionados = disponiveis.slice(0, 5) 

    const candidatosComEta = await Promise.all(
      selecionados.map(async entregador => {
        try {
          if (!entregador.coordenada || !restaurante.coordenada) {
            return { entregador, eta: Infinity }
          }
          const resumo = await this.roteamentoService.calcularResumo(
            entregador.coordenada,
            restaurante.coordenada
          )
          return { entregador, eta: resumo.duracao_estimada_segundos }
        } catch (error) {
          return { entregador, eta: Infinity }
        }
      })
    )

    candidatosComEta.sort((a, b) => a.eta - b.eta)
    melhor = candidatosComEta[0].entregador
    etaFinal = candidatosComEta[0].eta

    logger.info(`Sucesso: Entregador ${melhor.nome} vinculado ao pedido ${pedidoId}.`, 'EntregaService');

    const existing = await this.repository.buscarEntregaPorPedidoId(Number(pedidoId));
    let result;
    if (existing && existing.length > 0) {
      const entregaExistente = existing[0];
      const entregaNova = Entrega.criar({
        id: entregaExistente.id,
        pedido_id: entregaExistente.pedido_id,
        entregador_id: melhor.id!,
        status: 'ATRIBUIDA',
        previsao_entrega: entregaExistente.previsao_entrega
      });
      result = await this.repository.editarEntregaPorId(entregaExistente.id!, entregaNova);
      logger.info(`[AtribuirMelhorEntregadorUseCase] Entrega existente para o pedido ${pedidoId} atualizada no banco de dados.`, 'EntregaService');
    } else {
      const statusObj = new StatusEntrega('ATRIBUIDA')
      const entrega = new Entrega(
        Number(pedidoId),
        Number(melhor.id!),
        statusObj,
        null
      )
      result = await this.repository.criarEntrega(entrega)
    }

    entregasAtribuidas.add(1, { origem: 'requisicao' })

    if (melhor.statusObj.estaDisponivel()) {
      try {
        await this.entregadorService.atualizarStatus(melhor.id!, 'EM_ENTREGA')
        logger.info(`Status de ${melhor.nome} alterado para EM_ENTREGA`, 'GRPC');
      } catch (err: any) {
        logger.error(`Falha ao atualizar status do entregador: ${err.message}`, 'GRPC');
      }
    }

    return result
  }
}
