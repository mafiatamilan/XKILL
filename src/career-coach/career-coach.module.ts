import { Module } from '@nestjs/common';
import { CareerCoachController } from './career-coach.controller';
import { CareerCoachService } from './career-coach.service';
import { CareerCoachRepository } from './career-coach.repository';

@Module({
  controllers: [CareerCoachController],
  providers: [CareerCoachService, CareerCoachRepository],
  exports: [CareerCoachService],
})
export class CareerCoachModule {}
