import { describe, it, expect } from 'vitest';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { graphql } from 'graphql';
import { aplicarAuthDirective } from '../../src/shared/presentation/graphql/authDirective.js';

/**
 * A diretiva de autorização, exercitada sobre um schema mínimo.
 *
 * É a peça que substituiu o `if (!context.user) throw` espalhado pelos
 * resolvers. Um teste aqui vale por todos os campos protegidos do schema real:
 * se a diretiva regride, tudo regride junto.
 */

const typeDefs = /* GraphQL */ `
  directive @auth(roles: [String!]) on FIELD_DEFINITION

  type Query {
    aberto: String
    autenticado: String @auth
    somenteEntregador: String @auth(roles: ["ENTREGADOR"])
    lojaOuEntregador: String @auth(roles: ["RESTAURANTE", "ENTREGADOR"])
    quemSouEu: String @auth
  }
`;

const resolvers = {
  Query: {
    aberto: () => 'catálogo público',
    autenticado: () => 'conteúdo protegido',
    somenteEntregador: () => 'corridas pendentes',
    lojaOuEntregador: () => 'painel compartilhado',
    quemSouEu: (_p: unknown, _a: unknown, ctx: any) => `usuário ${ctx.user.id}`,
  },
};

const schema = aplicarAuthDirective(makeExecutableSchema({ typeDefs, resolvers }));

const executar = (campo: string, user: unknown) =>
  graphql({ schema, source: `{ ${campo} }`, contextValue: { user } });

const codigo = (r: any) => r.errors?.[0]?.extensions?.code ?? null;

const CLIENTE = { id: 1, role: 'CLIENTE' };
const ENTREGADOR = { id: 2, role: 'ENTREGADOR' };
const LOJISTA = { id: 3, role: 'RESTAURANTE' };

describe('diretiva @auth', () => {
  it('deixa passar campo sem diretiva, mesmo sem token', async () => {
    const r = await executar('aberto', null);
    expect(r.errors).toBeUndefined();
    expect(r.data?.aberto).toBe('catálogo público');
  });

  it('barra campo protegido quando não há usuário no contexto', async () => {
    expect(codigo(await executar('autenticado', null))).toBe('UNAUTHENTICATED');
  });

  it('libera campo protegido para qualquer perfil autenticado', async () => {
    for (const user of [CLIENTE, ENTREGADOR, LOJISTA]) {
      const r = await executar('autenticado', user);
      expect(r.errors, `perfil ${(user as any).role} deveria passar`).toBeUndefined();
    }
  });

  it('barra perfil errado com FORBIDDEN, não com UNAUTHENTICATED', async () => {
    // a distinção importa: o cliente sabe se o problema é login ou permissão
    expect(codigo(await executar('somenteEntregador', CLIENTE))).toBe('FORBIDDEN');
    expect(codigo(await executar('somenteEntregador', LOJISTA))).toBe('FORBIDDEN');
  });

  it('libera o perfil correto', async () => {
    const r = await executar('somenteEntregador', ENTREGADOR);
    expect(r.errors).toBeUndefined();
    expect(r.data?.somenteEntregador).toBe('corridas pendentes');
  });

  it('aceita qualquer um dos perfis quando a lista tem mais de um', async () => {
    expect((await executar('lojaOuEntregador', LOJISTA)).errors).toBeUndefined();
    expect((await executar('lojaOuEntregador', ENTREGADOR)).errors).toBeUndefined();
    expect(codigo(await executar('lojaOuEntregador', CLIENTE))).toBe('FORBIDDEN');
  });

  it('exige autenticação antes de checar o perfil', async () => {
    expect(codigo(await executar('somenteEntregador', null))).toBe('UNAUTHENTICATED');
  });

  it('entrega o usuário do contexto ao resolver original', async () => {
    // é assim que o dono de um recurso deixa de ser um argumento forjável
    const r = await executar('quemSouEu', CLIENTE);
    expect(r.data?.quemSouEu).toBe('usuário 1');
  });

  it('trata perfil ausente no token como não autorizado', async () => {
    expect(codigo(await executar('somenteEntregador', { id: 4 }))).toBe('FORBIDDEN');
  });
});
