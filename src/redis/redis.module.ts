import { Global, Module, OnApplicationShutdown } from '@nestjs/common';
import Redis from 'ioredis';
import { AppConfigService } from '../config/app-config.service';

export const REDIS_CLIENT = 'REDIS_CLIENT';

/**
 * ioredis client that owns its connection lifecycle so Nest shuts it down
 * cleanly alongside the application.
 */
export class RedisClientProvider extends Redis implements OnApplicationShutdown {
  async onApplicationShutdown(): Promise<void> {
    if (this.status === 'ready' || this.status === 'connecting') {
      await this.quit();
    }
  }
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService): RedisClientProvider => {
        const client = new RedisClientProvider(config.get().redisUrl, {
          maxRetriesPerRequest: 2,
          enableOfflineQueue: false,
        });
        client.on('error', (err) => {
          console.error('[redis] connection error', err.message);
        });
        return client;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
