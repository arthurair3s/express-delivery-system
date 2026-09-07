import { describe, it, expect } from 'vitest';
import path from 'path';
import { loadFilesSync } from '@graphql-tools/load-files';
import { mergeTypeDefs } from '@graphql-tools/merge';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { validate, parse, type GraphQLSchema } from 'graphql';

/**
 * Guarda de exposição de dados, verificada contra o schema real.
 *
 * A diretiva @auth protege campo a campo, mas não enxerga a travessia do grafo:
 * um campo liberado pode servir de porta para um tipo que carrega muito mais do
 * que a tela precisa. Estes testes fixam a forma do schema — se alguém trocar
 * UsuarioPublico por Usuario numa relação, a consulta abusiva volta a validar e
 * o teste quebra.
 */

let schema: GraphQLSchema;

function montarSchema(): GraphQLSchema {
  if (!schema) {
    // sem resolvers de propósito: o que está sob teste é a forma do schema, e
    // importá-los arrastaria o container de injeção de dependência junto
    const typeDefs = mergeTypeDefs(loadFilesSync(path.join(process.cwd(), 'src/**/*.graphql')));
    schema = makeExecutableSchema({ typeDefs, resolvers: {} });
  }
  return schema;
}

const aceita = (consulta: string) => validate(montarSchema(), parse(consulta)).length === 0;

describe('exposição de dados do cliente', () => {
  it('não expõe PII do cliente pelo painel do lojista', () => {
    expect(aceita(`{ pedidosPorRestaurante(restaurante_id: 1) {
      usuario { email telefone latitude longitude } } }`)).toBe(false);
  });

  it('não deixa o lojista alcançar o histórico do cliente nos concorrentes', () => {
    // Pedido -> usuario -> pedidos daria a lista de compras em outras lojas
    expect(aceita(`{ pedidosPorRestaurante(restaurante_id: 1) {
      usuario { pedidos { restaurante_id valor_total } } } }`)).toBe(false);
  });

  it('não expõe PII pela relação da avaliação', () => {
    expect(aceita('{ avaliacoes { usuario { email telefone endereco } } }')).toBe(false);
  });

  it('não tem query raiz que liste todos os usuários', () => {
    expect(aceita('{ usuarios { id email } }')).toBe(false);
  });

  it('não tem query raiz que leia uma conta por id', () => {
    expect(aceita('{ usuario(id: 42) { email } }')).toBe(false);
  });
});

describe('o que as telas realmente precisam continua funcionando', () => {
  it('o lojista vê nome e endereço para preparar a entrega', () => {
    expect(aceita(`{ pedidosPorRestaurante(restaurante_id: 1) {
      id status usuario { id nome endereco } } }`)).toBe(true);
  });

  it('o entregador vê nome e endereço do destino', () => {
    expect(aceita('{ entregasPendentes { pedido { usuario { nome endereco } } } }')).toBe(true);
  });

  it('o usuário vê a própria conta completa', () => {
    expect(aceita('{ me { id nome email telefone endereco latitude longitude role } }')).toBe(true);
  });

  it('o usuário vê os próprios pedidos sem informar identidade', () => {
    expect(aceita('{ meusPedidos { id valor_total status } }')).toBe(true);
  });
});
