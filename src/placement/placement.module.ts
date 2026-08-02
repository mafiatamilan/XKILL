import { Module } from '@nestjs/common';
import { PlacementController } from './placement.controller';
import { PlacementRepository } from './placement.repository';
import { PlacementService } from './placement.service';

@Module({
  controllers: [PlacementController],
  providers: [PlacementService, PlacementRepository],
  exports: [PlacementService],
})
export class PlacementModule {}
