import { Global, Module } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
import { OPENCODE_CLIENT, createAiClient } from './ai-client.provider';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';

@Global()
@Module({
  controllers: [AiController],
  providers: [
    {
      provide: OPENCODE_CLIENT,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => {
        const ai = config.get().ai;
        return createAiClient({
          baseUrl: ai.baseUrl,
          apiKey: ai.apiKey,
        });
      },
    },
    AiService,
  ],
  exports: [AiService],
})
export class AiModule {}
