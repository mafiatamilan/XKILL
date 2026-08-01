import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import {
  DatabaseHealthIndicator,
  Judge0HealthIndicator,
  RedisHealthIndicator,
} from './health.indicators';
import { HealthService } from './health.service';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [HealthService, DatabaseHealthIndicator, RedisHealthIndicator, Judge0HealthIndicator],
})
export class HealthModule {}
