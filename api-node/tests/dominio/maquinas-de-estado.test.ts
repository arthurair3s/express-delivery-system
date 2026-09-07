import { describe, it, expect } from 'vitest';
import { StatusPedido, StatusPedidoInvalidoError } from '../../src/pedido/domain/StatusPedido.js';
import { StatusEntrega, StatusEntregaInvalidoError } from '../../src/entrega/domain/StatusEntrega.js';
import { StatusEntregador } from '../../src/entregador/domain/StatusEntregador.js';

/**
 * As três máquinas de estado do sistema. São elas que impedem um pedido de
 * saltar de PENDENTE direto para ENTREGUE, ou um entregador de aceitar corrida
 * enquanto está offline.
 */

const podeIr = (de: string, para: string) =>
  new StatusPedido(de).podeTransicionarPara(new StatusPedido(para));

describe('StatusPedido', () => {
  it('permite apenas o avanço de uma etapa por vez', () => {
    expect(podeIr('PENDENTE', 'EM_PREPARO_ENTREGA')).toBe(true);
    expect(podeIr('EM_PREPARO_ENTREGA', 'SAIU_PARA_ENTREGA')).toBe(true);
    expect(podeIr('SAIU_PARA_ENTREGA', 'ENTREGUE')).toBe(true);
  });

  it('recusa pular etapas', () => {
    expect(podeIr('PENDENTE', 'ENTREGUE')).toBe(false);
    expect(podeIr('PENDENTE', 'SAIU_PARA_ENTREGA')).toBe(false);
    expect(podeIr('EM_PREPARO_ENTREGA', 'ENTREGUE')).toBe(false);
  });

  it('recusa voltar atrás', () => {
    expect(podeIr('SAIU_PARA_ENTREGA', 'EM_PREPARO_ENTREGA')).toBe(false);
    expect(podeIr('ENTREGUE', 'SAIU_PARA_ENTREGA')).toBe(false);
  });

  it('permite cancelar de qualquer etapa ainda em andamento', () => {
    for (const etapa of ['PENDENTE', 'EM_PREPARO_ENTREGA', 'SAIU_PARA_ENTREGA']) {
      expect(podeIr(etapa, 'CANCELADO'), `deveria poder cancelar de ${etapa}`).toBe(true);
    }
  });

  it('trata ENTREGUE e CANCELADO como estados finais', () => {
    for (const final of ['ENTREGUE', 'CANCELADO']) {
      for (const destino of ['PENDENTE', 'EM_PREPARO_ENTREGA', 'SAIU_PARA_ENTREGA', 'ENTREGUE', 'CANCELADO']) {
        expect(podeIr(final, destino), `${final} não deveria ir para ${destino}`).toBe(false);
      }
    }
  });

  it('recusa um status que não existe', () => {
    expect(() => new StatusPedido('EM_ROTA')).toThrow(StatusPedidoInvalidoError);
  });

  it('exige a grafia exata, em maiúsculas', () => {
    // comportamento assimétrico e proposital do sistema: StatusPedido é estrito,
    // StatusEntrega normaliza a caixa. documentado aqui para não regredir sem querer.
    expect(() => new StatusPedido('pendente')).toThrow(StatusPedidoInvalidoError);
  });
});

describe('StatusEntrega', () => {
  const vai = (de: string, para: string) =>
    new StatusEntrega(de).podeTransicionarPara(new StatusEntrega(para));

  it('segue o caminho feliz de ponta a ponta', () => {
    expect(vai('PENDENTE', 'ATRIBUIDA')).toBe(true);
    expect(vai('ATRIBUIDA', 'EM_TRANSITO')).toBe(true);
    expect(vai('EM_TRANSITO', 'ENTREGUE')).toBe(true);
  });

  it('recusa entregar o que ainda não saiu para entrega', () => {
    expect(vai('PENDENTE', 'ENTREGUE')).toBe(false);
    expect(vai('ATRIBUIDA', 'ENTREGUE')).toBe(false);
  });

  it('trata ENTREGUE e CANCELADA como estados finais', () => {
    expect(vai('ENTREGUE', 'CANCELADA')).toBe(false);
    expect(vai('CANCELADA', 'ATRIBUIDA')).toBe(false);
  });

  it('normaliza a caixa da entrada', () => {
    expect(new StatusEntrega('pendente').valor).toBe('PENDENTE');
  });

  it('recusa um status que não existe', () => {
    expect(() => new StatusEntrega('A_CAMINHO')).toThrow(StatusEntregaInvalidoError);
  });
});

describe('StatusEntregador', () => {
  const vai = (de: string, para: string) =>
    new StatusEntregador(de).podeTransicionarPara(new StatusEntregador(para));

  it('exige passar por DISPONIVEL antes de entrar em entrega', () => {
    // um entregador offline não pode receber corrida direto
    expect(vai('OFFLINE', 'EM_ENTREGA')).toBe(false);
    expect(vai('OFFLINE', 'DISPONIVEL')).toBe(true);
    expect(vai('DISPONIVEL', 'EM_ENTREGA')).toBe(true);
  });

  it('permite ficar offline a partir de qualquer estado ativo', () => {
    expect(vai('DISPONIVEL', 'OFFLINE')).toBe(true);
    expect(vai('EM_ENTREGA', 'OFFLINE')).toBe(true);
  });

  it('libera o entregador de volta para DISPONIVEL ao terminar', () => {
    expect(vai('EM_ENTREGA', 'DISPONIVEL')).toBe(true);
  });
});
