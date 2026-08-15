import { Module } from '@nestjs/common';
import { FacultyPortalController } from './faculty-portal.controller';
import { FacultyPortalService } from './faculty-portal.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [FacultyPortalController],
  providers: [FacultyPortalService],
  exports: [FacultyPortalService],
})
export class FacultyPortalModule {}
