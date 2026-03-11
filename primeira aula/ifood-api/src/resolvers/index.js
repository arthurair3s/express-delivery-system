import { usuarioResolver } from './usuarioResolver.js'
import { restauranteResolver } from './restauranteResolver.js'
import { produtoResolver } from './produtoResolver.js'
import { pedidoResolver } from './pedidoResolver.js'
import { itemPedidoResolver } from './itemPedidoResolver.js'
import { categoriaResolver } from './categoriaResolver.js'
import { entregadorResolver } from './entregadorResolver.js'
import { entregaResolver } from './entregaResolver.js'
import { pagamentoResolver } from './pagamentoResolver.js'
import { avaliacaoResolver } from './avaliacaoResolver.js'

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
  avaliacaoResolver
]
