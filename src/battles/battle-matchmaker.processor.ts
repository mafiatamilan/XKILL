import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { BattlesService, BATTLE_MATCHMAKING_QUEUE } from './battles.service';

@Processor(BATTLE_MATCHMAKING_QUEUE)
export class BattleMatchmakerProcessor extends WorkerHost {
  private readonly logger = new Logger(BattleMatchmakerProcessor.name);

  constructor(private readonly battles: BattlesService) {
    super();
  }

  override async process(_job: Job): Promise<void> {
    await this.battles.runMatchmakingTick();
  }
}
