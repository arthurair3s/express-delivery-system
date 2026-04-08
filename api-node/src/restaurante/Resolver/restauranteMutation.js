import { obterCoordenadas } from '../../utils/geocodingService.js'
import * as restauranteService from '../restauranteService.js'

export const Mutation = {
  criarRestaurante: async (_, args) => {
    const { nome, descricao, endereco, latitude, longitude } = args

    let coordenadas = { latitude: latitude || 0, longitude: longitude || 0 }

    // Se não passou lat/long manual mas passou endereço, tenta geocoding
    if (!latitude && !longitude && endereco) {
      try {
        const res = await obterCoordenadas(endereco)
        if (res) coordenadas = res
      } catch (error) {
        console.log('Falha ao buscar coordenadas, usando padrão 0,0', error)
      }
    }

    return await restauranteService.criar({
      nome,
      descricao,
      endereco,
      latitude: coordenadas.latitude,
      longitude: coordenadas.longitude
    })
  },

  editarRestaurante: async (_, args) => {
    const { id, ...dados } = args

    if (dados.endereco) {
      const coordenadas = await obterCoordenadas(dados.endereco)
      dados.latitude = coordenadas?.latitude || 0
      dados.longitude = coordenadas?.longitude || 0
    }

    return restauranteService.editarPorId(id, dados)
  },

  deletarRestaurante: async (_, { id }) =>
    !!(await restauranteService.deletar(id))
}
