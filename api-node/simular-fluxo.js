import * as pedidoService from './src/pedido/pedidoService.js';
import * as restauranteService from './src/restaurante/restauranteService.js';
import * as usuarioService from './src/usuario/usuarioService.js';
import * as entregadorService from './src/entregador/entregadorService.js';
import { prisma } from './src/database/connection.js';
import entregadorClient from './src/grpc/entregadorClient.js';

async function rodarFluxo() {
    console.log("=== Iniciando Simulação do Módulo Inteligente ===");
    try {
        const restaurantes = await restauranteService.listar();
        if(!restaurantes.length) throw new Error("Sem restaurantes. Rode o seed!");
        const usuarios = await usuarioService.listar();
        if(!usuarios.length) throw new Error("Sem usuários. Rode o seed!");
        const entregadores = await prisma.entregadores.findMany();
        if(!entregadores.length) throw new Error("Sem entregadores. Rode o seed!");

        const restauranteAlvo = restaurantes[0];
        const usuarioAlvo = usuarios[0];
        const entregadorProximo = entregadores[0];

        console.log(`\n🍔 Restaurante Alvo: ${restauranteAlvo.nome} em [${restauranteAlvo.latitude}, ${restauranteAlvo.longitude}]`);
        
        // TELEPORTE: Atualiza o Redis via gRPC Stream antes de criar o pedido
        console.log(`\n🚀 Teleportando Entregador ${entregadorProximo.nome} para perto do restaurante...`);
        
        await new Promise((resolve, reject) => {
            const stream = entregadorClient.AtualizarLocalizacaoStream((err, response) => {
                if (err) return reject(err);
                console.log(`   [gRPC Stream] ${response.mensagem}`);
                resolve();
            });
            
            // Enviamos uma posição 500 metros ao norte do restaurante
            stream.write({
                entregadorId: entregadorProximo.id,
                latitude: restauranteAlvo.latitude + 0.004, 
                longitude: restauranteAlvo.longitude + 0.004
            });
            stream.end();
        });

        console.log(`\n👤 Usuário solicitante: ${usuarioAlvo.nome}`);

        const dadosNovoPedido = {
            usuario_id: usuarioAlvo.id,
            restaurante_id: restauranteAlvo.id,
            valor_total: 89.90,
            destino_latitude: restauranteAlvo.latitude + 0.005,
            destino_longitude: restauranteAlvo.longitude + 0.005,
        };

        const pedidoCriado = await pedidoService.criar(dadosNovoPedido);

        console.log('\n✅ Pedido Criado com Sucesso!');
        console.log(`🆔 ID do Pedido: ${pedidoCriado.id}`);
        console.log(`📦 Status Final do Pedido: ${pedidoCriado.status}`);

        const entrega = await prisma.entregas.findFirst({
            where: { pedido_id: pedidoCriado.id },
            include: { entregadores: true }
        });

        if (entrega) {
            console.log("\n🚚 --- DADOS DA ENTREGA GERADA ---");
            console.log(`Status da Entrega: ${entrega.status}`);
            console.log(`Entregador Designado: ${entrega.entregadores.nome} (Veículo: ${entrega.entregadores.veiculo})`);

            // Verificando o banco para atestar que o Prisma aceitou o status "EM_ENTREGA" corretamente
            const entregadorDb = await prisma.entregadores.findUnique({ where: { id: entrega.entregador_id }});
            console.log(`Status do Entregador no BD C#/Prisma: ${entregadorDb.status}`);
        } else {
            console.log("\n❌ Nenhuma entrega foi associada ao pedido (Módulo Inteligente pode ter falhado).");
        }

    } catch(err) {
        console.error("\n❌ Erro durante simulação:", err.message);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

rodarFluxo();
