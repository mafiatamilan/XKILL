import { Module } from '@nestjs/common';
import { JobsController, CompaniesController } from './jobs.controller';
import { JobsService } from './jobs.service';

@Module({
  controllers: [JobsController, CompaniesController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
