import { ApolloServer } from '@apollo/server'
import { startStandaloneServer } from '@apollo/server/standalone'
import fs, { readFileSync, readdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import { resolvers } from './resolvers.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const getGraphQLFiles = dir => {
  const files = readdirSync(dir, { withFileTypes: true })
  let typeDefs = ''

  if (fs.existsSync(path.join(dir, 'schema.graphql'))) {
    typeDefs += readFileSync(path.join(dir, 'schema.graphql'), 'utf-8') + '\n'
  }

  for (const file of files) {
    if (file.isDirectory()) {
      const gqlFile = path.join(dir, file.name, `${file.name}.graphql`)
      if (fs.existsSync(gqlFile)) {
        typeDefs += readFileSync(gqlFile, 'utf-8') + '\n'
      }
    }
  }
  return typeDefs
}

const typeDefs = getGraphQLFiles(__dirname)

const server = new ApolloServer({
  typeDefs,
  resolvers
})

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
  cors: {
    origin: [
      'https://sandbox.embed.apollographql.com',
      'http://localhost:4000'
    ],
    credentials: true
  }
})

console.log(`Servidor rodando em ${url}`)
