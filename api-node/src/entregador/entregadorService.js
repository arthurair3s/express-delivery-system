import * as restauranteService from '../restaurante/restauranteService.js'
import entregadorClient from '../grpc/entregadorClient.js'
import roteamentoClient from '../grpc/roteamentoClient.js'

let simulacaoInterval = null;
const motoristasBases = new Map();

const HUBS_RJ = [
  { name: 'Copacabana', lat: -22.9711, lng: -43.1822 },
  { name: 'Centro', lat: -22.9035, lng: -43.1730 },
  { name: 'Maracanã', lat: -22.9126, lng: -43.2301 },
  { name: 'Cachambi / Norte Shopping', lat: -22.8860, lng: -43.2770 },
  { name: 'Méier', lat: -22.9022, lng: -43.2800 },
  { name: 'Madureira', lat: -22.8735, lng: -43.3360 },
  { name: 'Barra da Tijuca', lat: -23.0003, lng: -43.3658 },
  { name: 'Recreio', lat: -23.0183, lng: -43.4672 },
  { name: 'Bangu', lat: -22.8741, lng: -43.4646 },
  { name: 'Ilha do Governador', lat: -22.8092, lng: -43.2039 }
];

const motoristasEmSimulacao = new Set();

export const bloquearParaSimulacao = (id) => motoristasEmSimulacao.add(Number(id));
export const liberarDeSimulacao = (id) => motoristasEmSimulacao.delete(Number(id));
export const estaEmSimulacao = (id) => motoristasEmSimulacao.has(Number(id));

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
  const frotaDesejada = 50;
  
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

  // inicia loop de gps aleatorio (3s)
  simulacaoInterval = setInterval(async () => {
    try {
      const atuais = await listar();
      atuais.forEach(async e => {
        if (e.status !== 'DISPONIVEL' && e.status !== 1 && e.status !== '1') return;

        if (estaEmSimulacao(e.id)) return;

        if (!motoristasBases.has(e.id)) {
          const hub = HUBS_RJ[Math.floor(Math.random() * HUBS_RJ.length)];
          // Cria um offset fixo de até 5km para que cada motorista tenha sua própria "área de patrulha"
          const offsetLat = (Math.random() - 0.5) * 0.05;
          const offsetLng = (Math.random() - 0.5) * 0.05;
          motoristasBases.set(e.id, { 
            lat: hub.lat + offsetLat, 
            lng: hub.lng + offsetLng 
          });
        }
        
        const base = motoristasBases.get(e.id);

        // Salto grande para efeito visual de "radar" dinâmico
        const jumpLat = (Math.random() - 0.5) * 0.05;
        const jumpLng = (Math.random() - 0.5) * 0.05;
        
        const latRaw = base.lat + jumpLat;
        const lngRaw = base.lng + jumpLng;

        // Snapping via OSRM para evitar que o motoboy nasça/ande na água
        const snapped = await new Promise((resolve) => {
          roteamentoClient.EncaixarNaEstrada(
            { latitude: latRaw, longitude: lngRaw }, 
            (error, response) => {
              if (error || !response) {
                // Se falhar o roteamento, mantém a original (fallback)
                resolve({ latitude: latRaw, longitude: lngRaw });
              } else {
                resolve(response);
              }
            }
          );
        });

        try {
          await atualizarLocalizacao(e.id, snapped.latitude, snapped.longitude);
        } catch (err) {
          // ignora falhas pontuais de jitter
        }
      });
    } catch (err) {
       console.error(`[Simulação] Falha ao consultar lista:`, err.message);
    }
  }, 3000);

  return true;
};
