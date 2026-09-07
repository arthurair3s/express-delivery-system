import { metrics } from '@opentelemetry/api';

/**
 * Métricas de negócio do Backend Core.
 *
 * as instrumentações automáticas já cobrem latência e volume de HTTP, gRPC e
 * banco. o que elas não sabem é o que cada requisição significa para o negócio:
 * um pico de erro aparece nelas, mas "nenhum pedido está sendo atribuído há dez
 * minutos" não. é isso que os contadores abaixo respondem.
 *
 * o meter é resolvido de forma preguiçosa pela API do OpenTelemetry: se o SDK
 * ainda não subiu, as chamadas viram no-op em vez de quebrar.
 */
const meter = metrics.getMeter('express-delivery.negocio');

export const pedidosCriados = meter.createCounter('pedidos_criados_total', {
  description: 'Pedidos confirmados pelo cliente',
});

export const pagamentosProcessados = meter.createCounter('pagamentos_processados_total', {
  description: 'Pagamentos processados, particionados por método e resultado',
});

export const entregasAtribuidas = meter.createCounter('entregas_atribuidas_total', {
  description: 'Entregas que receberam um entregador',
});

export const eventosPublicados = meter.createCounter('eventos_publicados_total', {
  description: 'Eventos publicados no RabbitMQ, particionados por routing key e resultado',
});

export const eventosDescartados = meter.createCounter('eventos_descartados_total', {
  description: 'Mensagens rejeitadas pelo consumidor e enviadas para a DLQ',
});
