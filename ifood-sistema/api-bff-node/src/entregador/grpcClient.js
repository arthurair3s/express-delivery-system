import grpc from '@grpc/grpc-js'
import protoLoader from '@grpc/proto-loader'
import path from 'path'

const PROTO_PATH = path.resolve(process.cwd(), 'protos/entregadores.proto')

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
})

const entregadorProto = grpc.loadPackageDefinition(packageDefinition)

const client = new entregadorProto.EntregadorService(
  process.env.ENTREGADORES_SERVICE_URL || 'ms_entregadores:5000',
  grpc.credentials.createInsecure()
)

export default client
