import { ApolloServer } from '@apollo/server'
import { startStandaloneServer } from '@apollo/server/standalone'
import { readFileSync, readdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import { resolvers } from './resolvers/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const graphqlFiles = readdirSync(path.join(__dirname, 'graphql')).filter(f => f.endsWith('.graphql'))
const typeDefs = graphqlFiles.map(file => 
  readFileSync(path.join(__dirname, 'graphql', file), { encoding: 'utf-8' })
).join('\n')

const server = new ApolloServer({
  typeDefs,
  resolvers
})

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 }
})

console.log(`Servidor rodando em ${url}`)
