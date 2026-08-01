import { Module } from '@nestjs/common';
import { AcademicsRepository } from './academics.repository';
import { AcademicsService } from './academics.service';
import { AcademicsController } from './academics.controller';
import { FacultyAcademicsService } from './faculty-academics.service';
import { FacultyController } from './faculty-academics.controller';
import { CollegeAdminService } from './college-admin.service';
import { CollegeAdminController } from './college-admin.controller';

@Module({
  controllers: [AcademicsController, FacultyController, CollegeAdminController],
  providers: [AcademicsService, FacultyAcademicsService, CollegeAdminService, AcademicsRepository],
  exports: [AcademicsService, FacultyAcademicsService, CollegeAdminService],
})
export class AcademicsModule {}
