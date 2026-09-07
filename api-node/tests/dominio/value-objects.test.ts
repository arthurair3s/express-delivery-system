import { describe, it, expect } from 'vitest';
import { Dinheiro, DinheiroInvalidoError } from '../../src/shared/domain/value-objects/Dinheiro.js';
import { Coordenada, CoordenadaInvalidaError } from '../../src/shared/domain/value-objects/Coordenada.js';
import { Email, EmailInvalidoError } from '../../src/shared/domain/value-objects/Email.js';
import { SenhaHash, SenhaHashInvalidaError } from '../../src/shared/domain/value-objects/SenhaHash.js';

describe('Dinheiro', () => {
  it('guarda o valor em centavos, e não em ponto flutuante', () => {
    // é a razão de o Value Object existir: 0.1 + 0.2 em float dá 0.30000000000000004
    const soma = new Dinheiro(0.1).somar(new Dinheiro(0.2));
    expect(soma.valor).toBe(0.3);
    expect(soma.centavos).toBe(30);
  });

  it('arredonda a entrada para o centavo mais próximo', () => {
    expect(new Dinheiro(10.999).centavos).toBe(1100);
    expect(new Dinheiro(10.994).centavos).toBe(1099);
  });

  it('recusa valor negativo', () => {
    expect(() => new Dinheiro(-0.01)).toThrow(DinheiroInvalidoError);
  });

  it('recusa subtração que levaria a valor negativo', () => {
    const dez = new Dinheiro(10);
    expect(() => dez.subtrair(new Dinheiro(10.01))).toThrow(DinheiroInvalidoError);
  });

  it('multiplica sem perder precisão', () => {
    // preço de item vezes quantidade é o caso real em ItemPedido.calcularSubtotal
    expect(new Dinheiro(19.99).multiplicar(3).valor).toBe(59.97);
  });

  it('compara por valor, não por identidade', () => {
    expect(new Dinheiro(25.5).equals(new Dinheiro(25.5))).toBe(true);
    expect(new Dinheiro(25.5).equals(new Dinheiro(25.51))).toBe(false);
  });

  it('aceita zero como valor válido', () => {
    expect(Dinheiro.zero().valor).toBe(0);
  });
});

describe('Coordenada', () => {
  it('recusa latitude fora de -90 a 90', () => {
    expect(() => new Coordenada(90.1, 0)).toThrow(CoordenadaInvalidaError);
    expect(() => new Coordenada(-90.1, 0)).toThrow(CoordenadaInvalidaError);
  });

  it('recusa longitude fora de -180 a 180', () => {
    expect(() => new Coordenada(0, 180.1)).toThrow(CoordenadaInvalidaError);
    expect(() => new Coordenada(0, -180.1)).toThrow(CoordenadaInvalidaError);
  });

  it('aceita os extremos exatos do intervalo', () => {
    expect(() => new Coordenada(90, 180)).not.toThrow();
    expect(() => new Coordenada(-90, -180)).not.toThrow();
  });

  it('calcula a distância entre dois pontos do Rio com erro abaixo de 1 km', () => {
    // Maracanã e Copacabana: cerca de 8 km em linha reta
    const maracana = new Coordenada(-22.9121, -43.2302);
    const copacabana = new Coordenada(-22.9711, -43.1822);
    const km = maracana.calcularDistanciaKm(copacabana);
    expect(km).toBeGreaterThan(7);
    expect(km).toBeLessThan(9);
  });

  it('dá distância zero entre um ponto e ele mesmo', () => {
    const p = new Coordenada(-22.9, -43.2);
    expect(p.calcularDistanciaKm(p)).toBe(0);
  });
});

describe('Email', () => {
  it('normaliza espaços e caixa', () => {
    expect(new Email('  Fulano@Exemplo.COM  ').valor).toBe('fulano@exemplo.com');
  });

  it('recusa formatos inválidos', () => {
    for (const invalido of ['sem-arroba', 'sem@dominio', '@sem-usuario.com', 'com espaco@x.com', '']) {
      expect(() => new Email(invalido), `deveria recusar '${invalido}'`).toThrow(EmailInvalidoError);
    }
  });

  it('compara depois de normalizar', () => {
    expect(new Email('A@B.com').equals(new Email('a@b.com'))).toBe(true);
  });
});

describe('SenhaHash', () => {
  it('nunca guarda a senha em texto claro', async () => {
    const vo = await SenhaHash.deSenhaPlana('senha-secreta-123');
    expect(vo.valor).not.toContain('senha-secreta-123');
    expect(vo.valor.startsWith('$2')).toBe(true);
  });

  it('confirma a senha correta e recusa a errada', async () => {
    const vo = await SenhaHash.deSenhaPlana('senha-secreta-123');
    expect(await vo.comparar('senha-secreta-123')).toBe(true);
    expect(await vo.comparar('senha-errada')).toBe(false);
  });

  it('gera hashes diferentes para a mesma senha', async () => {
    // salt por hash: dois usuários com a mesma senha não têm o mesmo registro
    const a = await SenhaHash.deSenhaPlana('mesma-senha');
    const b = await SenhaHash.deSenhaPlana('mesma-senha');
    expect(a.valor).not.toBe(b.valor);
  });

  it('exige senha com pelo menos 6 caracteres', async () => {
    await expect(SenhaHash.deSenhaPlana('12345')).rejects.toThrow(SenhaHashInvalidaError);
  });

  it('recusa um hash que não venha do bcrypt', () => {
    expect(() => new SenhaHash('texto-plano')).toThrow(SenhaHashInvalidaError);
  });
});
