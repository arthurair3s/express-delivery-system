import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';

import { API_URL } from '../config';

const httpLink = createHttpLink({
  uri: API_URL,
});

export const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          entregadores: {
            merge(existing, incoming) {
              return incoming;
            }
          },
          pedidos: {
            merge(existing, incoming) {
              return incoming;
            }
          }
        }
      }
    }
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'network-only',
      errorPolicy: 'ignore',
    },
    query: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    },
  }
});
