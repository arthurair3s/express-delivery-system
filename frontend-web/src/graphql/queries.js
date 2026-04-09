export const GET_RESTAURANTES = `
  query GetRestaurantes {
    restaurantes {
      id
      nome
      endereco
      latitude
      longitude
    }
  }
`;

export const GET_RESTAURANTE_MENU = `
  query GetRestauranteMenu($id: ID!) {
    restaurante(id: $id) {
      id
      nome
      categorias {
        id
        nome
        produtos {
          id
          nome
          descricao
          preco
        }
      }
    }
  }
`;

export const CRIAR_PEDIDO = `
  mutation CriarPedido($restaurante_id: ID!, $destino_latitude: Float!, $destino_longitude: Float!, $valor_total: Float!) {
    criarPedido(
      usuario_id: "1", 
      restaurante_id: $restaurante_id,
      valor_total: $valor_total,
      destino_latitude: $destino_latitude,
      destino_longitude: $destino_longitude
    ) {
      id
      status
    }
  }
`;

export const ACOMPANHAR_PEDIDO = `
  query AcompanharPedido($id: ID!) {
    pedido(id: $id) {
      id
      status
      entregas {
        id
        status
        entregador {
          id
          nome
          latitude
          longitude
        }
        resumo_trajeto {
          distancia_km
          duracao_estimada_segundos
        }
        rota_coleta {
          caminho { latitude longitude }
        }
        rota_entrega {
          caminho { latitude longitude }
        }
        rota {
          caminho {
            latitude
            longitude
          }
        }
      }
    }
  }
`;

export const ATUALIZAR_STATUS_ENTREGA = `
  mutation AtualizarStatus($id: ID!, $status: String!) {
    editarEntrega(id: $id, status: $status) {
      id
      status
    }
  }
`;

export const MOVER_ENTREGADOR = `
  mutation MoverEntregador($id: ID!, $latitude: Float!, $longitude: Float!) {
    editarEntregador(id: $id, latitude: $latitude, longitude: $longitude) {
      id
    }
  }
`;

export const POVOAR_FROTA = `
  mutation PovoarFrota {
    povoarFrota
  }
`;

export const SIMULAR_DESLOCAMENTO = `
  mutation SimularDeslocamento($id: ID!) {
    simularDeslocamento(id: $id)
  }
`;
