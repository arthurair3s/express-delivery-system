import 'dotenv/config';
import entregadorClient from './src/grpc/entregadorClient.js';
import * as entregadorService from './src/entregador/entregadorService.js';

// Coordenada base (Zona Norte RJ - Eixo Higienópolis / Maria da Graça / Cachambi)
const BASE_LAT = -22.8770;
const BASE_LNG = -43.2566;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function garantirFrotaMinima(entregadoresAtuais) {
  const frotaDesejada = 15;
  if (entregadoresAtuais.length >= frotaDesejada) {
    return entregadoresAtuais;
  }

  const faltam = frotaDesejada - entregadoresAtuais.length;
  console.log(`Frota pequena detectada. Recrutando ${faltam} novos entregadores dinamicamente via gRPC...`);

  for (let i = 1; i <= faltam; i++) {
    const nomeFake = `Motoqueiro ${i} (Robô)`;
    try {
      await entregadorService.criar({
        nome: nomeFake,
        telefone: `2198888${i.toString().padStart(4, '0')}`,
        veiculo: 'Moto Honda CG 160'
      });
    } catch (e) {
      console.error(`Erro ao recrutar ${nomeFake}:`, e.message);
    }
  }
  
  // Retorna a lista completa atualizada do banco
  return await entregadorService.listar();
}

async function iniciarSimulador() {
  console.log("Iniciando Simulador de Frota na Zona Norte do Rio...");

  let entregadores = [];
  try {
    entregadores = await entregadorService.listar();
    // Garante que a gente tenha bastante motorista na região pra distribuir as rotas
    entregadores = await garantirFrotaMinima(entregadores);
    console.log(`${entregadores.length} entregadores apostos para a frota ZN.`);
  } catch (err) {
    console.error("Erro ao falar com gRPC. O ms-entregadores-cs está rodando?", err.message);
    process.exit(1);
  }

  // Abre a conexão de fluxo contínuo (Stream) de GPS com o C#
  const stream = entregadorClient.AtualizarLocalizacaoStream((error, response) => {
    if (error) {
      console.error("Erro no Stream de Localização:", error.message);
    }
  });

  console.log("\n Transmitindo posições GPS a cada 3 segundos na grande ZN");

  setInterval(() => {
    entregadores.forEach((entregador) => {
      // Variação ampliada (Aprox. 7km de raio em volta da base)
      // Math.random() - 0.5 dá um valor entre -0.5 e 0.5.
      // 1 grau de latitude é aprox 111km. 0.13 * 111 = 14km de diametro (7km de raio)
      const randomLat = (Math.random() - 0.5) * 0.13; 
      const randomLng = (Math.random() - 0.5) * 0.13;

      const latitudeAtual = BASE_LAT + randomLat;
      const longitudeAtual = BASE_LNG + randomLng;

      stream.write({
        entregador_id: entregador.id,
        latitude: latitudeAtual,
        longitude: longitudeAtual
      });

      console.log(` ${entregador.nome} espalhado em Lat: ${latitudeAtual.toFixed(4)}, Lng: ${longitudeAtual.toFixed(4)}`);
    });
  }, 3000);
}

iniciarSimulador();

