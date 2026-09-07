import 'dotenv/config';
import './instrumentation.js';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadFilesSync } from '@graphql-tools/load-files';
import { mergeTypeDefs } from '@graphql-tools/merge';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { aplicarAuthDirective } from './shared/presentation/graphql/authDirective.js';

import { resolvers } from './resolvers.js';
import { DomainError } from './shared/errors/DomainError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const loadedFiles = loadFilesSync(path.join(__dirname, '**/*.graphql'));
const typeDefs = mergeTypeDefs(loadedFiles);

interface MyContext {
  user: any;
}

import { diContainer } from './shared/infrastructure/container.js';
import { rabbitMQPublisher } from './shared/infrastructure/messaging/rabbitmqPublisher.js';
import { rabbitMQConsumer } from './shared/infrastructure/messaging/rabbitmqConsumer.js';

rabbitMQPublisher.connect().catch((err) => {
  console.error('RabbitMQ startup connection error:', err);
});

rabbitMQConsumer.connect().catch((err) => {
  console.error('RabbitMQ consumer startup connection error:', err);
});

// A autorização é aplicada como uma transformação do schema: todo campo marcado
// com @auth passa a ter o seu resolver embrulhado pela checagem de token/perfil.
const schema = aplicarAuthDirective(makeExecutableSchema({ typeDefs, resolvers }));

const server = new ApolloServer<MyContext>({
  schema,
  formatError: (formattedError, error: any) => {
    const originalError = error?.originalError || error;

    // com o protótipo das subclasses preservado, basta um instanceof: a
    // comparação por sufixo do nome existia só porque ele não funcionava.
    if (originalError instanceof DomainError) {
      return {
        ...formattedError,
        message: originalError.message,
        extensions: {
          ...formattedError.extensions,
          code: 'BAD_USER_INPUT',
          domainCode: originalError.code || 'DOMAIN_ERROR'
        }
      };
    }

    if (error?.extensions?.code === 'BAD_USER_INPUT' && error?.extensions?.zodError) {
      return {
        ...formattedError,
        message: error.message,
        details: error.extensions.zodError
      };
    }
    return formattedError;
  }
});

const tokenService = diContainer.getJwtTokenService();

const { url } = await startStandaloneServer(server, {
  listen: { 
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : 4000, 
    host: '0.0.0.0' 
  },
  context: async ({ req }): Promise<MyContext> => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    const user = token ? tokenService.verificarToken(token) : null;
    return { user };
  }
});

console.log(`🚀 Servidor rodando em ${url}`);
