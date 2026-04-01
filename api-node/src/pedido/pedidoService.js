import * as pedidoRepository from './pedidoRepository.js'
import * as restauranteRepository from '../restaurante/restauranteRepository.js'
import * as entregaService from '../entrega/entregaService.js'
import * as entregaRepository from '../entrega/entregaRepository.js'
import * as entregadorService from '../entregador/entregadorService.js' 


export const listar = async () => {
  return pedidoRepository.listarPedidos()
}

export const buscarPorId = async id => {
  return pedidoRepository.buscarPedidoPorId(id)
}

export const criar = async dados => {
  const restaurante = await restauranteRepository.buscarRestaurantePorId(dados.restaurante_id);

  if (!restaurante || !restaurante.latitude || !restaurante.longitude) {
    throw new Error('Restaurante não encontrado ou sem coordenadas cadastradas.');
  }

  const entregadoresProximos = await entregadorService.listarProximosAoRestaurante(restaurante.id, 5);

  console.log("Motoqueiros listados via Service:", entregadoresProximos);

    let entregadorEscolhido = null;

  const ocupados = entregadoresProximos.filter(e => e.status === 'EM_ENTREGA' || e.status === 2);

  for (const motociclista of ocupados) {
    const estaNaLoja = await entregaRepository.possuiEntregaAtivaNoRestaurante(motociclista.id, restaurante.id);
    if (estaNaLoja) {
      entregadorEscolhido = motociclista;
      console.log(`BATCHING APROVADO! O(a) Entregador(a) ${motociclista.nome} levará 2 pedidos.`);
      break;
    }
  }

  if (!entregadorEscolhido) {
    entregadorEscolhido = entregadoresProximos.find(e => e.status === 'DISPONIVEL' || e.status === 1);
    if (entregadorEscolhido) {
      console.log(`O(a) Entregador(a) Livre ${entregadorEscolhido.nome} pegou a corrida.`);
    }
  }

  if (!entregadorEscolhido) {
    throw new Error('Infelizmente, não há motoqueiros disponíveis no raio de 5km deste Restaurante agora.');
  }

  const novoPedido = await pedidoRepository.criarPedido({
    ...dados,
    status: 'EM_PREPARO_ENTREGA' 
  });

  const novaEntrega = await entregaService.criar({
    pedido_id: novoPedido.id,
    entregador_id: entregadorEscolhido.id,
    status: 'ATRIBUIDA'
  });

  console.log(`Entrega Criada: Motorista [ID: ${entregadorEscolhido.id}] linkado ao Pedido [ID: ${novoPedido.id}]`);

  if (entregadorEscolhido.status === 'DISPONIVEL' || entregadorEscolhido.status === 1) {
    try {
      await entregadorService.atualizarStatus(entregadorEscolhido.id, 'EM_ENTREGA');
      console.log(`Status gRPC C# [${entregadorEscolhido.nome}] alterado para EM_ENTREGA`);
    } catch (grpcErr) {
      console.error("Falha gRPC ao definir Motoqueiro como EM_ENTREGA:", grpcErr.message);
    }
  }

  return novoPedido;
}

export const editarPorId = async (id, dados) => {
  return pedidoRepository.editarPedidoPorId(id, dados)
}

export const deletar = async id => {
  return pedidoRepository.deletarPedido(id)
}