import axios from 'axios'

export const obterCoordenadas = async endereco => {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endereco)}&limit=1`

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'SistemaGeocodificacaoNode/1.0 (arthuraires0@gmail.com)',
        'Accept-Language': 'pt-BR'
      }
    })

    const data = response.data

    if (data && data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon)
      }
    }

    throw new Error('Endereço não encontrado')
  } catch (error) {
    console.error('Erro de geocodificação: ', error.message)
    return null
  }
}
