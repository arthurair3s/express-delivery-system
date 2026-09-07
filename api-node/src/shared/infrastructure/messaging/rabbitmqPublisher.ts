import amqp from 'amqplib';
import { IEventPublisher } from '../../application/ports/IEventPublisher.js';
import { eventosPublicados } from '../../observability/metrics.js';

export class RabbitMQPublisher implements IEventPublisher {
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;
  private readonly exchangeName = 'delivery-events';
  private isConnecting = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor() {}

  async connect(): Promise<void> {
    if (this.connection && this.channel) {
      return;
    }

    if (this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    const user = process.env.RABBIT_USER || 'admin';
    const pass = process.env.RABBIT_PASS || 'admin123';
    const host = process.env.RABBIT_HOST || 'localhost';
    const port = process.env.RABBIT_PORT || '5672';
    const url = process.env.RABBIT_URL || `amqp://${user}:${pass}@${host}:${port}`;

    try {
      console.log(`Connecting to RabbitMQ...`);
      const conn = await amqp.connect(url);
      
      conn.on('error', (err: Error) => {
        console.error('RabbitMQ connection error:', err);
        this.handleDisconnect();
      });

      conn.on('close', (reason?: Error) => {
        console.log('RabbitMQ connection closed:', reason);
        this.handleDisconnect();
      });

      const chan = await conn.createChannel();
      
      chan.on('error', (err: Error) => {
        console.error('RabbitMQ channel error:', err);
      });

      chan.on('close', () => {
        console.log('RabbitMQ channel closed.');
        this.channel = null;
      });

      await chan.assertExchange(this.exchangeName, 'topic', { durable: true });
      
      this.connection = conn;
      this.channel = chan;
      
      console.log(`Connected to RabbitMQ and exchange '${this.exchangeName}' asserted.`);
    } catch (err) {
      console.error('Failed to connect to RabbitMQ:', err);
      this.handleDisconnect();
    } finally {
      this.isConnecting = false;
    }
  }

  private handleDisconnect(): void {
    if (this.connection) {
      const conn = this.connection;
      try {
        conn.close().catch(() => {});
      } catch (e) {}
    }
    this.connection = null;
    this.channel = null;

    if (!this.reconnectTimeout && !this.isConnecting) {
      console.log('Scheduling RabbitMQ reconnection in 5s...');
      this.reconnectTimeout = setTimeout(() => {
        this.reconnectTimeout = null;
        this.connect().catch((err) => {
          console.error('Reconnection attempt failed:', err);
        });
      }, 5000);
    }
  }

  async publish(routingKey: string, payload: any): Promise<boolean> {
    try {
      if (!this.channel) {
        await this.connect();
      }
      const activeChannel = this.channel;
      if (!activeChannel) {
        console.warn('RabbitMQ channel is not available. Message dropped.');
        eventosPublicados.add(1, { routing_key: routingKey, resultado: 'descartado' });
        return false;
      }
      
      const content = Buffer.from(JSON.stringify(payload));
      const result = activeChannel.publish(this.exchangeName, routingKey, content, {
        persistent: true,
      });
      console.log(`[Event Published] Exchange: ${this.exchangeName}, Key: ${routingKey}`);
      eventosPublicados.add(1, { routing_key: routingKey, resultado: 'publicado' });
      return result;
    } catch (err) {
      console.error('Error publishing event to RabbitMQ:', err);
      eventosPublicados.add(1, { routing_key: routingKey, resultado: 'erro' });
      return false;
    }
  }
}

export const rabbitMQPublisher = new RabbitMQPublisher();
export default rabbitMQPublisher;
