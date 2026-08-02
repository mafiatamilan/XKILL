import { Module } from '@nestjs/common';
import { InterviewController } from './interview.controller';
import { InterviewService } from './interview.service';
import { InterviewRepository } from './interview.repository';

@Module({
  controllers: [InterviewController],
  providers: [InterviewService, InterviewRepository],
  exports: [InterviewService],
})
export class InterviewsModule {}
