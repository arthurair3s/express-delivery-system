import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CacheAside } from '../../src/shared/infrastructure/cache/cacheAside.js';
import { CachedRestauranteRepository } from '../../src/restaurante/infrastructure/adapters/cachedRestauranteRepository.js';
import { Restaurante } from '../../src/restaurante/domain/Restaurante.js';

/**
 * O decorator de cache. O que precisa ficar garantido aqui é que ele se comporta
 * como o repositório real em qualquer cenário — inclusive com o Redis fora do ar.
 */

function redisFalso() {
  const loja = new Map<string, string>();
  return {
    loja,
    get: vi.fn(async (k: string) => (loja.has(k) ? loja.get(k)! : null)),
    set: vi.fn(async (k: string, v: string) => { loja.set(k, v); return 'OK'; }),
    del: vi.fn(async (...ks: string[]) => { ks.forEach((k) => loja.delete(k)); return ks.length; }),
  };
}

const cantina = () => Restaurante.criar({
  id: 1, nome: 'Cantina', descricao: 'italiana', endereco: 'Rua X',
  latitude: -22.9, longitude: -43.2,
});

function montar(redis = redisFalso()) {
  const origem = {
    listarRestaurantes: vi.fn(async () => [cantina()]),
    buscarRestaurantePorId: vi.fn(async (id: any) => (String(id) === '9' ? null : cantina())),
    criarRestaurante: vi.fn(async (r: any) => r),
    editarRestaurantePorId: vi.fn(async (_id: any, r: any) => r),
    deletarRestaurante: vi.fn(async () => true),
  };
  const repo = new CachedRestauranteRepository(origem as any, new CacheAside('Teste', redis as any));
  return { repo, origem, redis };
}

describe('CachedRestauranteRepository', () => {
  let ctx: ReturnType<typeof montar>;
  beforeEach(() => { ctx = montar(); });

  it('vai à origem uma vez e serve do cache na segunda leitura', async () => {
    await ctx.repo.listarRestaurantes();
    await ctx.repo.listarRestaurantes();
    expect(ctx.origem.listarRestaurantes).toHaveBeenCalledTimes(1);
  });

  it('reidrata entidades de domínio, não objetos soltos', async () => {
    await ctx.repo.listarRestaurantes();
    const [doCache] = await ctx.repo.listarRestaurantes();
    // um JSON.parse cru devolveria { _nome: ... } sem invariantes nem Value Objects
    expect(doCache).toBeInstanceOf(Restaurante);
    expect(doCache.nome).toBe('Cantina');
    expect(doCache.coordenada?.latitude).toBe(-22.9);
  });

  it('grava com o TTL definido para a listagem', async () => {
    await ctx.repo.listarRestaurantes();
    expect(ctx.redis.set).toHaveBeenCalledWith(
      'cache:restaurantes:all', expect.any(String), 'EX', 300,
    );
  });

  it('invalida a listagem e o item ao editar', async () => {
    await ctx.repo.listarRestaurantes();
    await ctx.repo.buscarRestaurantePorId(1);
    await ctx.repo.editarRestaurantePorId(1, {} as any);

    expect(ctx.redis.del).toHaveBeenCalledWith('cache:restaurantes:all', 'cache:restaurante:1');
    expect(ctx.redis.loja.size).toBe(0);
  });

  it('invalida a listagem ao criar', async () => {
    await ctx.repo.listarRestaurantes();
    await ctx.repo.criarRestaurante(cantina());
    expect(ctx.redis.loja.has('cache:restaurantes:all')).toBe(false);
  });

  it('invalida ao deletar', async () => {
    await ctx.repo.buscarRestaurantePorId(1);
    await ctx.repo.deletarRestaurante(1);
    expect(ctx.redis.loja.has('cache:restaurante:1')).toBe(false);
  });

  it('não cacheia ausência', async () => {
    // gravar null transformaria "ainda não existe" em "não existe por N segundos"
    await ctx.repo.buscarRestaurantePorId(9);
    await ctx.repo.buscarRestaurantePorId(9);
    expect(ctx.origem.buscarRestaurantePorId).toHaveBeenCalledTimes(2);
    expect(ctx.redis.loja.has('cache:restaurante:9')).toBe(false);
  });

  it('continua respondendo com o Redis fora do ar', async () => {
    const quebrado = {
      get: vi.fn(async () => { throw new Error('conexão recusada'); }),
      set: vi.fn(async () => { throw new Error('conexão recusada'); }),
      del: vi.fn(async () => { throw new Error('conexão recusada'); }),
    };
    const { repo, origem } = montar(quebrado as any);

    const lista = await repo.listarRestaurantes();
    expect(lista).toHaveLength(1);
    expect(origem.listarRestaurantes).toHaveBeenCalledTimes(1);

    // e a escrita também não pode falhar por causa do cache
    await expect(repo.editarRestaurantePorId(1, {} as any)).resolves.toBeDefined();
  });
});
