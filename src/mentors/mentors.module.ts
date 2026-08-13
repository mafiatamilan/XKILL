import { Module } from '@nestjs/common';
import { MentorsController, BookingsController } from './mentors.controller';
import { MentorsService } from './mentors.service';

@Module({
  controllers: [MentorsController, BookingsController],
  providers: [MentorsService],
  exports: [MentorsService],
})
export class MentorsModule {}
