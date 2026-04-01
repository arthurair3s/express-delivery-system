import pgPkg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import prismaPkg from '@prisma/client'
import { fileURLToPath } from 'url'

const { Pool } = pgPkg
const { PrismaClient } = prismaPkg

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/ifood_clone?schema=public'

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// =============================================================================
// RESTAURANTES — Altere latitude/longitude conforme necessário
// Coordenadas abaixo são de pontos reais em São Paulo (cobertos pelo OSRM)
// =============================================================================
const RESTAURANTES = [
  {
    nome: "Pizzaria Cachambi",
    descricao: 'Pizzas no forno a lenha, receita italiana original perto do Norte Shopping',
    endereco: 'Rua Cachambi, 340 - Cachambi, Rio de Janeiro',
    latitude: -22.8861,
    longitude: -43.2778
  },
  {
    nome: 'Sushi Maria da Graça',
    descricao: 'As melhores peças de salmão da ZN',
    endereco: 'Rua Conde de Azambuja, 200 - Maria da Graça, Rio de Janeiro',
    latitude: -22.8767,
    longitude: -43.2721
  },
  {
    nome: 'Lanchonete Bonsucesso',
    descricao: 'Lanches de rua e batata frita da melhor qualidade',
    endereco: 'Praça das Nações - Bonsucesso, Rio de Janeiro',
    latitude: -22.8631,
    longitude: -43.2554
  },
  {
    nome: "Braga's Burguer",
    descricao: 'Os melhores hambúrgueres artesanais de Higienópolis',
    endereco: 'R. Ten. Abel Cunha, 10B - Higienópolis, Rio de Janeiro',
    latitude: -22.877022,
    longitude: -43.256681
  }
]

// =============================================================================
// USUÁRIOS — Altere nome, email e telefone conforme necessário
// =============================================================================
const USUARIOS = [
  {
    nome: 'Ana Lima',
    email: 'ana.lima@email.com',
    telefone: '11999990001',
    senha: 'senha123'
  },
  {
    nome: 'Carlos Mota',
    email: 'carlos.mota@email.com',
    telefone: '11999990002',
    senha: 'senha123'
  },
  {
    nome: 'Fernanda Cruz',
    email: 'fernanda.cruz@email.com',
    telefone: '11999990003',
    senha: 'senha123'
  }
]

// =============================================================================
// ENTREGADORES — Apenas dados cadastrais (Postgres)
// A posição geográfica é atualizada via gRPC stream (Redis), não via seed
// =============================================================================
const ENTREGADORES = [
  {
    nome: 'Lucas Andrade',
    telefone: '11988880001',
    veiculo: 'Moto Honda CG 160'
  },
  {
    nome: 'Mariana Souza',
    telefone: '11988880002',
    veiculo: 'Bicicleta Elétrica'
  },
  {
    nome: 'Pedro Oliveira',
    telefone: '11988880003',
    veiculo: 'Moto Yamaha Factor 125'
  }
]

// =============================================================================
// CATEGORIAS E PRODUTOS — Altere livremente
// =============================================================================
const CATEGORIAS_POR_RESTAURANTE = {
  'Pizzaria Cachambi': [
    {
      nome: 'Pizzas Salgadas',
      produtos: [
        { nome: 'Margherita', descricao: 'Mussarela e manjericão fresco', preco: 45.0 },
        { nome: 'Pepperoni', descricao: 'Pepperoni italiano importado', preco: 52.0 },
      ]
    }
  ],
  'Sushi Maria da Graça': [
    {
      nome: 'Combinados',
      produtos: [
        { nome: 'Combinado ZN', descricao: '12 peças: 6 niguiri + 6 hossomaki', preco: 49.9 },
        { nome: 'Temaki Salmão', descricao: 'Salmão fresco e cream cheese', preco: 22.9 }
      ]
    }
  ],
  'Lanchonete Bonsucesso': [
    {
      nome: 'Lanches',
      produtos: [
        { nome: 'X-Tudo', descricao: 'Pão, carne, ovo, bacon, calabresa', preco: 25.0 },
        { nome: 'Batata com Cheddar', descricao: 'Porção grande', preco: 18.0 }
      ]
    }
  ],
  "Braga's Burguer": [
    {
      nome: 'Hambúrgueres',
      produtos: [
        { nome: 'Classic Burger', descricao: 'Pão brioche, carne 180g', preco: 32.9 },
        { nome: 'Double Smash', descricao: 'Dois smash burgers', preco: 42.9 }
      ]
    }
  ]
}

// =============================================================================
// AVALIAÇÕES — nota de 1 a 5
// =============================================================================
const AVALIACOES_CONFIG = [
  {
    usuario_idx: 0,
    restaurante_idx: 0,
    nota: 5,
    comentario: 'Melhor hambúrguer que já comi!'
  },
  {
    usuario_idx: 1,
    restaurante_idx: 1,
    nota: 4,
    comentario: 'Sushi fresquíssimo, entrega rápida.'
  },
  {
    usuario_idx: 2,
    restaurante_idx: 2,
    nota: 5,
    comentario: 'Pizza como na Itália!'
  },
  {
    usuario_idx: 0,
    restaurante_idx: 1,
    nota: 3,
    comentario: 'Gostei, mas demorou um pouco.'
  }
]

// =============================================================================
// EXECUÇÃO DA SEED
// =============================================================================
async function main() {
  console.log('Iniciando seed do banco de dados...\n')

  // Limpa os dados existentes na ordem correta (respeitando FK)
  console.log('Limpando dados anteriores...')
  await prisma.avaliacoes.deleteMany()
  await prisma.itens_pedido.deleteMany()
  await prisma.pagamentos.deleteMany()
  await prisma.entregas.deleteMany()
  await prisma.pedidos.deleteMany()
  await prisma.produtos.deleteMany()
  await prisma.categorias.deleteMany()
  await prisma.restaurantes.deleteMany()
  await prisma.entregadores.deleteMany()
  await prisma.usuarios.deleteMany()

  // Usuários
  console.log('Criando usuários...')
  const usuarios = await Promise.all(
    USUARIOS.map(u => prisma.usuarios.create({ data: u }))
  )

  // Restaurantes
  console.log('Criando restaurantes...')
  const restauranteMap = {}
  for (const dados of RESTAURANTES) {
    const r = await prisma.restaurantes.create({ data: dados })
    restauranteMap[dados.nome] = r
    console.log(
      `   ${r.nome} (id: ${r.id}) — lat: ${r.latitude}, lon: ${r.longitude}`
    )
  }

  // Categorias e Produtos
  console.log('Criando categorias e produtos...')
  const todosProdutos = []
  for (const [nomeRestaurante, categorias] of Object.entries(
    CATEGORIAS_POR_RESTAURANTE
  )) {
    const restaurante = restauranteMap[nomeRestaurante]
    for (const cat of categorias) {
      const categoria = await prisma.categorias.create({
        data: { nome: cat.nome, restaurante_id: restaurante.id }
      })
      for (const prod of cat.produtos) {
        const produto = await prisma.produtos.create({
          data: { ...prod, categoria_id: categoria.id }
        })
        todosProdutos.push(produto)
      }
    }
  }

  // Entregadores
  console.log('Criando entregadores...')
  const entregadores = await Promise.all(
    ENTREGADORES.map(e => prisma.entregadores.create({ data: e }))
  )

  // Pedidos (1 por usuário, em restaurantes diferentes)
  console.log('Criando pedidos...')
  const restaurantesArray = Object.values(restauranteMap)
  const pedidos = await Promise.all(
    usuarios.map((u, i) =>
      prisma.pedidos.create({
        data: {
          usuario_id: u.id,
          status: ['pendente', 'em_preparo', 'entregue'][i % 3],
          valor_total: 0 // será atualizado abaixo
        }
      })
    )
  )

  // Itens de Pedido (2 itens por pedido, pegando produtos variados)
  console.log('Criando itens de pedido...')
  for (let i = 0; i < pedidos.length; i++) {
    const pedido = pedidos[i]
    const prod1 = todosProdutos[(i * 2) % todosProdutos.length]
    const prod2 = todosProdutos[(i * 2 + 1) % todosProdutos.length]
    const total = Number(prod1.preco) + Number(prod2.preco)

    await prisma.itens_pedido.createMany({
      data: [
        {
          pedido_id: pedido.id,
          produto_id: prod1.id,
          quantidade: 1,
          preco_unitario: prod1.preco
        },
        {
          pedido_id: pedido.id,
          produto_id: prod2.id,
          quantidade: 1,
          preco_unitario: prod2.preco
        }
      ]
    })

    await prisma.pedidos.update({
      where: { id: pedido.id },
      data: { valor_total: total }
    })
  }

  // Pagamentos
  console.log('Criando pagamentos...')
  await Promise.all(
    pedidos.map((p, i) =>
      prisma.pagamentos.create({
        data: {
          pedido_id: p.id,
          metodo: ['cartao_credito', 'pix', 'dinheiro'][i % 3],
          status: 'aprovado',
          valor: p.valor_total ?? 0
        }
      })
    )
  )

  // Entregas
  console.log('Criando entregas...')
  await Promise.all(
    pedidos.map((p, i) =>
      prisma.entregas.create({
        data: {
          pedido_id: p.id,
          entregador_id: entregadores[i % entregadores.length].id,
          status: ['aguardando_coleta', 'a_caminho', 'entregue'][i % 3],
          previsao_entrega: new Date(Date.now() + (i + 1) * 30 * 60 * 1000) // +30min por pedido
        }
      })
    )
  )

  // Avaliações
  console.log('Criando avaliações...')
  for (const av of AVALIACOES_CONFIG) {
    await prisma.avaliacoes.create({
      data: {
        usuario_id: usuarios[av.usuario_idx].id,
        restaurante_id: restaurantesArray[av.restaurante_idx].id,
        nota: av.nota,
        comentario: av.comentario
      }
    })
  }

  console.log('\n Seed concluída com sucesso!')
  console.log(`   ${usuarios.length} usuários`)
  console.log(`   ${restaurantesArray.length} restaurantes`)
  console.log(`   ${todosProdutos.length} produtos`)
  console.log(`   ${entregadores.length} entregadores`)
  console.log(`   ${pedidos.length} pedidos`)
  console.log(
    `\n Lembre-se: as posições dos entregadores no Redis precisam ser`
  )
  console.log(
    `   atualizadas via gRPC (AtualizarLocalizacaoStream) separadamente.`
  )
}

main()
  .catch(e => {
    console.error('Erro na seed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
