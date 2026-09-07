import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AtribuirMelhorEntregadorUseCase } from '../../src/entrega/application/use-cases/AtribuirMelhorEntregadorUseCase.js';
import { EntregaInvalidaError } from '../../src/entrega/domain/Entrega.js';
import { Entregador } from '../../src/entregador/domain/Entregador.js';
import { StatusEntregador } from '../../src/entregador/domain/StatusEntregador.js';
import { Restaurante } from '../../src/restaurante/domain/Restaurante.js';
import { Pedido } from '../../src/pedido/domain/Pedido.js';
import { StatusPedido } from '../../src/pedido/domain/StatusPedido.js';
import { Dinheiro } from '../../src/shared/domain/value-objects/Dinheiro.js';
import { Coordenada } from '../../src/shared/domain/value-objects/Coordenada.js';

/**
 * O caso de uso mais denso do sistema, exercitado sem banco, sem gRPC e sem
 * broker — só com dublês das portas.
 *
 * É exatamente o que a inversão de dependência compra: a regra de "quem recebe
 * a corrida" pode ser verificada isoladamente. Se este arquivo precisasse de
 * Docker para rodar, a arquitetura não estaria fazendo o trabalho dela.
 */

const entregador = (id: number, nome: string, status: string, lat: number, lon: number) =>
  Entregador.criar({
    id, nome, telefone: '11999999999', veiculo: 'Moto',
    statusObj: new StatusEntregador(status), latitude: lat, longitude: lon,
  });

const restaurante = Restaurante.criar({
  id: 1, nome: 'Cantina do Teste', latitude: -22.9, longitude: -43.2,
});

const pedido = new Pedido(
  7, 1, new StatusPedido('PENDENTE'), new Dinheiro(50), new Coordenada(-22.95, -43.18), 42,
);

function montarCenario(overrides: Record<string, any> = {}) {
  const repo = {
    buscarEntregaPorPedidoId: vi.fn().mockResolvedValue([]),
    criarEntrega: vi.fn().mockImplementation(async (e: any) => e),
    editarEntregaPorId: vi.fn().mockImplementation(async (_id: any, e: any) => e),
  };
  const pedidoService = { buscarPorId: vi.fn().mockResolvedValue(pedido) };
  const restauranteService = { buscarPorId: vi.fn().mockResolvedValue(restaurante) };
  const entregadorService = {
    listarProximosAoRestaurante: vi.fn().mockResolvedValue([]),
    atualizarStatus: vi.fn().mockResolvedValue(undefined),
  };
  const roteamentoService = {
    calcularResumo: vi.fn().mockResolvedValue({ duracao_estimada_segundos: 600 }),
  };
  Object.assign({ repo, pedidoService, restauranteService, entregadorService, roteamentoService }, overrides);

  const useCase = new AtribuirMelhorEntregadorUseCase(
    repo as any, pedidoService as any, restauranteService as any,
    entregadorService as any, roteamentoService as any,
  );
  return { useCase, repo, pedidoService, restauranteService, entregadorService, roteamentoService };
}

describe('AtribuirMelhorEntregadorUseCase', () => {
  let cenario: ReturnType<typeof montarCenario>;
  beforeEach(() => { cenario = montarCenario(); });

  it('escolhe o entregador com o menor tempo estimado até o restaurante', async () => {
    const longe = entregador(1, 'Longe', 'DISPONIVEL', -22.99, -43.29);
    const perto = entregador(2, 'Perto', 'DISPONIVEL', -22.90, -43.20);
    cenario.entregadorService.listarProximosAoRestaurante.mockResolvedValue([longe, perto]);
    // o ETA não vem da distância: vem do roteamento, que conhece as vias
    cenario.roteamentoService.calcularResumo
      .mockResolvedValueOnce({ duracao_estimada_segundos: 900 })
      .mockResolvedValueOnce({ duracao_estimada_segundos: 300 });

    const entrega = await cenario.useCase.execute(42);

    expect(entrega.entregador_id).toBe(2);
    expect(entrega.status).toBe('ATRIBUIDA');
  });

  it('amplia o raio de busca quando ninguém aparece nos 2 km iniciais', async () => {
    cenario.entregadorService.listarProximosAoRestaurante
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([entregador(3, 'Elástico', 'DISPONIVEL', -22.92, -43.22)]);

    const entrega = await cenario.useCase.execute(42);

    expect(entrega.entregador_id).toBe(3);
    const raios = cenario.entregadorService.listarProximosAoRestaurante.mock.calls.map((c) => c[1]);
    expect(raios).toEqual([2.0, 3.5]);
  });

  it('ignora entregadores que não estão disponíveis', async () => {
    cenario.entregadorService.listarProximosAoRestaurante.mockResolvedValue([
      entregador(4, 'Ocupado', 'EM_ENTREGA', -22.90, -43.20),
      entregador(5, 'Livre', 'DISPONIVEL', -22.95, -43.25),
    ]);

    const entrega = await cenario.useCase.execute(42);
    expect(entrega.entregador_id).toBe(5);
  });

  it('falha quando o radar está vazio nos dois raios', async () => {
    cenario.entregadorService.listarProximosAoRestaurante.mockResolvedValue([]);
    await expect(cenario.useCase.execute(42)).rejects.toThrow(EntregaInvalidaError);
  });

  it('falha quando todos os candidatos estão ocupados', async () => {
    cenario.entregadorService.listarProximosAoRestaurante.mockResolvedValue([
      entregador(6, 'Ocupado A', 'EM_ENTREGA', -22.90, -43.20),
      entregador(7, 'Ocupado B', 'EM_ENTREGA', -22.91, -43.21),
    ]);
    await expect(cenario.useCase.execute(42)).rejects.toThrow(/ocupados/i);
  });

  it('falha quando o pedido não existe', async () => {
    cenario.pedidoService.buscarPorId.mockResolvedValue(null);
    await expect(cenario.useCase.execute(999)).rejects.toThrow(EntregaInvalidaError);
  });

  it('falha quando o restaurante não tem coordenadas', async () => {
    cenario.restauranteService.buscarPorId.mockResolvedValue(
      Restaurante.criar({ id: 1, nome: 'Sem GPS' }),
    );
    await expect(cenario.useCase.execute(42)).rejects.toThrow(/coordenadas/i);
  });

  it('reaproveita a entrega existente do pedido em vez de criar outra', async () => {
    // reatribuição não pode gerar entrega duplicada para o mesmo pedido
    cenario.repo.buscarEntregaPorPedidoId.mockResolvedValue([
      { id: 555, pedido_id: 42, entregador_id: null, previsao_entrega: null },
    ]);
    cenario.entregadorService.listarProximosAoRestaurante.mockResolvedValue([
      entregador(8, 'Novo', 'DISPONIVEL', -22.90, -43.20),
    ]);

    await cenario.useCase.execute(42);

    expect(cenario.repo.editarEntregaPorId).toHaveBeenCalledWith(555, expect.anything());
    expect(cenario.repo.criarEntrega).not.toHaveBeenCalled();
  });

  it('marca o entregador escolhido como EM_ENTREGA', async () => {
    cenario.entregadorService.listarProximosAoRestaurante.mockResolvedValue([
      entregador(9, 'Escolhido', 'DISPONIVEL', -22.90, -43.20),
    ]);

    await cenario.useCase.execute(42);

    expect(cenario.entregadorService.atualizarStatus).toHaveBeenCalledWith(9, 'EM_ENTREGA');
  });

  it('não deixa uma falha de roteamento derrubar a atribuição', async () => {
    // se o OSRM cai, o candidato entra com ETA infinito, mas ainda é atribuível
    cenario.entregadorService.listarProximosAoRestaurante.mockResolvedValue([
      entregador(10, 'Único', 'DISPONIVEL', -22.90, -43.20),
    ]);
    cenario.roteamentoService.calcularResumo.mockRejectedValue(new Error('OSRM fora do ar'));

    const entrega = await cenario.useCase.execute(42);
    expect(entrega.entregador_id).toBe(10);
  });
});
