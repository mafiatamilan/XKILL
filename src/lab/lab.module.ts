import { Module } from '@nestjs/common';
import { LabController } from './lab.controller';
import { LabService } from './lab.service';
import { LabRepository } from './lab.repository';

@Module({
  controllers: [LabController],
  providers: [LabService, LabRepository],
  exports: [LabService],
})
export class LabModule {}
