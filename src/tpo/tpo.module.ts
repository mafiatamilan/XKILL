import { Module } from '@nestjs/common';
import { TpoController } from './tpo.controller';
import { TpoService } from './tpo.service';

@Module({
  controllers: [TpoController],
  providers: [TpoService],
  exports: [TpoService],
})
export class TpoModule {}
