import { Module } from '@nestjs/common';
import { DsaModule } from '../dsa/dsa.module';
import { LeaderboardsController } from './leaderboards.controller';
import { LeaderboardService } from './leaderboards.service';
import { LeaderboardRepository } from './leaderboard.repository';

@Module({
  imports: [DsaModule],
  controllers: [LeaderboardsController],
  providers: [LeaderboardService, LeaderboardRepository],
  exports: [LeaderboardService],
})
export class LeaderboardsModule {}
