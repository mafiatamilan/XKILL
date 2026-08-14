import { Module } from '@nestjs/common';
import { CompanyPrepController } from './company-prep.controller';
import { CompanyPrepService } from './company-prep.service';

@Module({
  controllers: [CompanyPrepController],
  providers: [CompanyPrepService],
  exports: [CompanyPrepService],
})
export class CompanyPrepModule {}
