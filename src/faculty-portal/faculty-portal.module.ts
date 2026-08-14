import { Module } from '@nestjs/common';
import { FacultyPortalController } from './faculty-portal.controller';
import { FacultyPortalService } from './faculty-portal.service';

@Module({
  controllers: [FacultyPortalController],
  providers: [FacultyPortalService],
  exports: [FacultyPortalService],
})
export class FacultyPortalModule {}
