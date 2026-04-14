import * as restauranteService from '../restaurante/restauranteService.js'
import entregadorClient from '../grpc/entregadorClient.js'

let simulacaoInterval = null;
const BASE_LAT = -22.9035;
const BASE_LNG = -43.1730;

export const criar = dados => {
  return new Promise((resolve, reject) => {
    entregadorClient.CadastrarEntregador(dados, (error, response) => {
      if (error) return reject(error)
      resolve(response)
    })
  })
}

export const listarProximos = (latitude, longitude, raioKm) => {
  return new Promise((resolve, reject) => {
    entregadorClient.BuscarProximos(
      { latitude, longitude, raio_km: raioKm },
      (error, response) => {
        if (error) return reject(error)
        resolve(response.entregadores || [])
      }
    )
  })
}

export const listarProximosAoRestaurante = async (restauranteId, raioKm) => {
  const restaurante = await restauranteService.buscarPorId(restauranteId)

  if (!restaurante || !restaurante.latitude || !restaurante.longitude) {
    throw new Error(
      'Restaurante não encontrado ou sem coordenadas geográficas.'
    )
  }

  return new Promise((resolve, reject) => {
    entregadorClient.BuscarProximos(
      {
        latitude: restaurante.latitude,
        longitude: restaurante.longitude,
        raio_km: raioKm
      },
      (error, response) => {
        if (error) return reject(error)
        resolve(response.entregadores || [])
      }
    )
  })
}

export const buscarPorId = id => {
  return new Promise((resolve, reject) => {
    entregadorClient.ObterEntregadorPorId(
      { id: parseInt(id) },
      (error, response) => {
        if (error) return reject(error)
        resolve(response)
      }
    )
  })
}

export const editarPorId = (id, dados) => {
  return new Promise((resolve, reject) => {
    entregadorClient.EditarEntregador(
      { id: parseInt(id), ...dados },
      (error, response) => {
        if (error) return reject(error)
        resolve(response)
      }
    )
  })
}

export const deletar = id => {
  return new Promise((resolve, reject) => {
    entregadorClient.DeletarEntregador(
      { id: parseInt(id) },
      (error, response) => {
        if (error) return reject(error)
        resolve(response.sucesso)
      }
    )
  })
}

export const listar = () => {
  return new Promise((resolve, reject) => {
    entregadorClient.ListarTodosEntregadores({}, (error, response) => {
      if (error) return reject(error)
      resolve(response.entregadores || [])
    })
  })
}

const STATUS_MAP = {
  OFFLINE: 0,
  DISPONIVEL: 1,
  EM_ENTREGA: 2
};

export const atualizarStatus = (id, novoStatus) => {
  const statusEnum = STATUS_MAP[novoStatus];

  return new Promise((resolve, reject) => {
    entregadorClient.AtualizarStatus(
      { id: parseInt(id), novo_status: statusEnum },
      (error, response) => {
        if (error) return reject(error);
        resolve(response);
      }
    );
  });
};

export const atualizarLocalizacao = (id, latitude, longitude) => {
  return new Promise((resolve, reject) => {
    const stream = entregadorClient.AtualizarLocalizacaoStream((error, response) => { // abre stream gps c#
      if (error) return reject(error);
      resolve(response.sucesso);
    });
    
    const entregador_id = parseInt(id);
    console.log(`[GRPC-STREAM] Enviando -> ID: ${entregador_id}, Lat: ${latitude}, Lon: ${longitude}`);
    stream.write({ entregador_id, latitude, longitude });
    stream.end();
  });
};

export const povoarFrota = async () => {
  if (simulacaoInterval) return true;

  // 1. garante frota minima
  let entregadores = await listar();
  const frotaDesejada = 15;
  
  if (entregadores.length < frotaDesejada) {
    const faltam = frotaDesejada - entregadores.length;
    for (let i = 1; i <= faltam; i++) {
      try {
        await criar({
          nome: `Motoqueiro ${i} (Simulado)`,
          telefone: `219${Math.floor(Math.random() * 90000000 + 10000000)}`,
          veiculo: 'Moto Honda CG 160'
        });
      } catch (e) {
        console.error('erro ao criar entregador simulado:', e.message);
      }
    }
    entregadores = await listar();
  }

  // 2. inicia loop de gps aleatorio (3s)
  simulacaoInterval = setInterval(() => {
    entregadores.forEach(async e => {
      const current = await buscarPorId(e.id);
      
      if (current.status === 'EM_ENTREGA' || current.status === 2 || current.status === '2') return;

      try { await atualizarStatus(e.id, 'DISPONIVEL'); } catch(err) {}

      const randomLat = (Math.random() - 0.5) * 0.13;
      const randomLng = (Math.random() - 0.5) * 0.13;
      
      const lat = BASE_LAT + randomLat;
      const lng = BASE_LNG + randomLng;

      try {
        await atualizarLocalizacao(e.id, lat, lng);
      } catch (err) {
        console.error(`[Simulação] Erro ao atualizar GPS do entregador ${e.id}:`, err.message);
      }
    });
  }, 3000);

  return true;
};
