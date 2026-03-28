import grpc from '@grpc/grpc-js'
import protoLoader from '@grpc/proto-loader'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PROTO_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'protos',
  'roteamento.proto'
)

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
})

const roteamentoProto = grpc.loadPackageDefinition(packageDefinition)

const client = new roteamentoProto.RoteamentoService(
  process.env.ROTEAMENTO_SERVICE_URL,
  grpc.credentials.createInsecure()
)

export default client
