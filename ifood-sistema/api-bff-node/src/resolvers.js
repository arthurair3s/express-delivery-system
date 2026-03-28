import { usuarioResolver } from './usuario/Resolver/usuarioResolver.js'
import { restauranteResolver } from './restaurante/Resolver/restauranteResolver.js'
import { produtoResolver } from './produto/Resolver/produtoResolver.js'
import { pedidoResolver } from './pedido/Resolver/pedidoResolver.js'
import { itemPedidoResolver } from './itemPedido/Resolver/itemPedidoResolver.js'
import { categoriaResolver } from './categoria/Resolver/categoriaResolver.js'
import { entregadorResolver } from './entregador/Resolver/entregadorResolver.js'
import { entregaResolver } from './entrega/Resolver/entregaResolver.js'
import { pagamentoResolver } from './pagamento/Resolver/pagamentoResolver.js'
import { avaliacaoResolver } from './avaliacao/Resolver/avaliacaoResolver.js'
import { roteamentoResolver } from './roteamento/Resolver/roteamentoResolver.js'

export const resolvers = [
  usuarioResolver,
  restauranteResolver,
  produtoResolver,
  pedidoResolver,
  itemPedidoResolver,
  categoriaResolver,
  entregadorResolver,
  entregaResolver,
  pagamentoResolver,
  avaliacaoResolver,
  roteamentoResolver
]
