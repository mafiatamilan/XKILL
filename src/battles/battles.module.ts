import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AppConfigService } from '../config/app-config.service';
import { DsaModule } from '../dsa/dsa.module';
import { AuditModule } from '../audit/audit.module';
import { BattlesController } from './battles.controller';
import { BattlesService, BATTLE_MATCHMAKING_QUEUE } from './battles.service';
import { BattleRepository } from './battles.repository';
import { RankedQueue } from './ranked-queue';
import { BattleMatchmakerProcessor } from './battle-matchmaker.processor';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        connection: { url: config.get().redisUrl },
      }),
    }),
    BullModule.registerQueue({ name: BATTLE_MATCHMAKING_QUEUE }),
    forwardRef(() => DsaModule),
    AuditModule,
  ],
  controllers: [BattlesController],
  providers: [BattlesService, BattleRepository, RankedQueue, BattleMatchmakerProcessor],
  exports: [BattlesService],
})
export class BattlesModule {}
