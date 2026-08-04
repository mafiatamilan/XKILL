import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AppConfigService } from '../config/app-config.service';
import { JudgeModule } from '../judge/judge.module';
import { AuditModule } from '../audit/audit.module';
import { BattlesModule } from '../battles/battles.module';
import { DsaController } from './dsa.controller';
import { DsaTrackController } from './dsa-track.controller';
import { DsaCompeteController } from './dsa-compete.controller';
import { DsaService } from './dsa.service';
import { DsaTrackService } from './dsa-track.service';
import { DsaCompeteService } from './dsa-compete.service';
import { DsaRepository } from './dsa.repository';
import { DsaCompeteRepository } from './dsa-compete.repository';
import { RankingService } from './ranking.service';
import { DsaSubmissionsProcessor } from './dsa-submissions.processor';
import { DsaGateway } from './dsa.gateway';
import { SUBMISSION_QUEUE } from './submission.queue';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        connection: { url: config.get().redisUrl },
      }),
    }),
    BullModule.registerQueue({ name: SUBMISSION_QUEUE }),
    JudgeModule,
    AuditModule,
    forwardRef(() => BattlesModule),
  ],
  controllers: [DsaController, DsaTrackController, DsaCompeteController],
  providers: [
    DsaService,
    DsaTrackService,
    DsaCompeteService,
    DsaRepository,
    DsaCompeteRepository,
    RankingService,
    DsaSubmissionsProcessor,
    DsaGateway,
  ],
  exports: [DsaService, RankingService, DsaGateway, DsaCompeteRepository],
})
export class DsaModule {}
