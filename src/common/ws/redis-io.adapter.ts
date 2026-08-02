import { INestApplicationContext, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { Server, ServerOptions } from 'socket.io';

/**
 * Socket.io adapter that scales across processes via Redis pub/sub. One adapter
 * pair is created per app bootstrap; the same Redis URL as the queue/throttler.
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor?: ReturnType<typeof createAdapter>;
  private pubClient?: Redis;
  private subClient?: Redis;

  constructor(
    app: INestApplicationContext,
    private readonly redisUrl: string,
  ) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    try {
      const pubClient = new Redis(this.redisUrl, { maxRetriesPerRequest: 2 });
      const subClient = pubClient.duplicate();
      await Promise.all([
        pubClient.status === 'ready'
          ? undefined
          : new Promise<void>((resolve) => pubClient.once('ready', () => resolve())),
        subClient.status === 'ready'
          ? undefined
          : new Promise<void>((resolve) => subClient.once('ready', () => resolve())),
      ]);
      this.adapterConstructor = createAdapter(pubClient, subClient);
      this.pubClient = pubClient;
      this.subClient = subClient;
    } catch (err) {
      this.logger.error(`Failed to connect the Socket.io Redis adapter: ${(err as Error).message}`);
    }
  }

  async disconnectFromRedis(): Promise<void> {
    for (const client of [this.pubClient, this.subClient]) {
      if (client && (client.status === 'ready' || client.status === 'connecting')) {
        await client.quit();
      }
    }
  }

  override createIOServer(port: number, options?: ServerOptions): unknown {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }

  override async close(server: Server): Promise<void> {
    try {
      await super.close(server);
    } finally {
      await this.disconnectFromRedis();
    }
  }
}
