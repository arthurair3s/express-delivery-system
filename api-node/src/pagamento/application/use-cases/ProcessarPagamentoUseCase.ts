import type { IPagamentoRepository } from '../../domain/ports/IPagamentoRepository.js'
import type { IPedidoService } from '../../../pedido/application/ports/IPedidoService.js'
import type { IUsuarioService } from '../../../usuario/application/ports/IUsuarioService.js'
import type { IEventPublisher } from '../../../shared/application/ports/IEventPublisher.js'
import type { IPagamentoStrategy } from '../ports/IPagamentoStrategy.js'
import { Pagamento } from '../../domain/Pagamento.js'
import { Dinheiro } from '../../../shared/domain/value-objects/Dinheiro.js'
import { StatusPagamento } from '../../domain/StatusPagamento.js'
import { pagamentosProcessados } from '../../../shared/observability/metrics.js'
import { PagamentoPixStrategy } from '../../infrastructure/strategies/PagamentoPixStrategy.js'
import { PagamentoCartaoStrategy } from '../../infrastructure/strategies/PagamentoCartaoStrategy.js'
import { PagamentoStripeStrategy } from '../../infrastructure/strategies/PagamentoStripeStrategy.js'

export interface ProcessarPagamentoInput {
  pedido_id: string
  metodo?: string
  status?: string
  valor?: number
}

export class ProcessarPagamentoUseCase {
  constructor(
    private readonly repository: IPagamentoRepository,
    private readonly pedidoService: IPedidoService,
    private readonly usuarioService: IUsuarioService,
    private readonly eventPublisher: IEventPublisher
  ) {}

  async execute(dados: ProcessarPagamentoInput): Promise<Pagamento> {
    const metodoNorm = (dados.metodo || 'PIX').toUpperCase()
    let strategy: IPagamentoStrategy

    switch (metodoNorm) {
      case 'PIX':
        strategy = new PagamentoPixStrategy()
        break
      case 'CARTAO':
      case 'CREDITO':
      case 'DEBITO':
        strategy = new PagamentoCartaoStrategy()
        break
      case 'STRIPE':
        strategy = new PagamentoStripeStrategy()
        break
      default:
        strategy = new PagamentoPixStrategy()
    }

    const statusStr = dados.status || 'PENDENTE'
    const statusObj = new StatusPagamento(statusStr)
    const pagamento = new Pagamento(
      Number(dados.pedido_id),
      dados.metodo || 'PIX',
      new Dinheiro(Number(dados.valor || 0)),
      statusObj
    )

    if (statusStr === 'PENDENTE') {
      const res = await strategy.processar(pagamento)
      pagamento.status = res.status
    }

    const result = await this.repository.criarPagamento(pagamento)
    pagamentosProcessados.add(1, { metodo: metodoNorm, resultado: result.status })

    if (result.status === 'APROVADO') {
      this.publicarEventoAprovado(result).catch((err: unknown) => {
        console.error('Erro ao publicar pagamento.aprovado no criar:', err);
      });
    }

    return result
  }

  private async publicarEventoAprovado(pagamento: Pagamento): Promise<void> {
    const pedido = await this.pedidoService.buscarPorId(pagamento.pedido_id)
    let nomeUsuario = 'Cliente'
    let emailUsuario: string | null = null

    if (pedido) {
      const usuario = await this.usuarioService.buscarPorId(pedido.usuario_id)
      if (usuario) {
        nomeUsuario = usuario.nome
        emailUsuario = usuario.email
      }
    }

    await this.eventPublisher.publish('pagamento.aprovado', {
      id: pagamento.id,
      pedido_id: pagamento.pedido_id,
      metodo: pagamento.metodo,
      valor: pagamento.valor,
      status: pagamento.status,
      usuario_nome: nomeUsuario,
      usuario_email: emailUsuario
    })
  }
}
