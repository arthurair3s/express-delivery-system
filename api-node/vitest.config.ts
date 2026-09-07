import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // O graphql-js guarda estado no módulo e recusa objetos vindos de outra
    // instância. Como o pacote publica CJS e ESM, o Vitest carregava um formato
    // para o teste e outro para o @graphql-tools, e a execução falhava com
    // "Cannot use GraphQLSchema from another module or realm". O alias fixa uma
    // única entrada para todo mundo.
    dedupe: ['graphql'],
    alias: [{ find: /^graphql$/, replacement: 'graphql/index.js' }],
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // alguns módulos constroem o container de DI no import, e o JwtTokenService
    // aborta sem segredo. um valor de teste mantém `npm test` funcionando sem
    // depender do .env da máquina.
    env: { JWT_SECRET: 'segredo-de-teste' },
    server: {
      deps: { inline: [/graphql/, /@graphql-tools/] },
    },
  },
});
